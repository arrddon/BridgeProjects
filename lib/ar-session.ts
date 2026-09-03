import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Spot } from './bridge-config';
import { loadEngine, type XR8Engine } from './xr-engine';

export type SessionState = 'loading' | 'camera' | 'placing' | 'ready' | 'playing' | 'completed' | 'error';
export type Session = { start(): Promise<void>; play(): Promise<void>; dispose(): void };
type Options = {
  canvas: HTMLCanvasElement; spot: Spot; mode: 'ar' | 'preview';
  onState(state: SessionState, message?: string): void;
  onProgress(progress: number): void;
  onComplete(): void;
};

function disposeObject(object: THREE.Object3D) {
  object.traverse(node => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}

export function createSession(options: Options): Session {
  const { canvas, spot, mode, onState, onProgress, onComplete } = options;
  const abort = new AbortController();
  let xr: XR8Engine | undefined;
  let ownsXR = false;
  let renderer: THREE.WebGLRenderer | undefined;
  let scene: THREE.Scene | undefined;
  let camera: THREE.PerspectiveCamera | undefined;
  let media: HTMLMediaElement | undefined;
  let mixer: THREE.AnimationMixer | undefined;
  const actions: THREE.AnimationAction[] = [];
  let videoTexture: THREE.VideoTexture | undefined;
  let state: SessionState = 'loading';
  let previewFrame = 0;
  let placed = false;
  let tracking = mode === 'preview';
  let frameCount = 0;
  let reportedTime = -1;
  let observer: ResizeObserver | undefined;
  const root = new THREE.Group();
  root.rotation.set(...spot.rotation);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const activePointers = new Set<number>();
  let drag: { id: number; offset: THREE.Vector3 } | undefined;
  let previewDrag: { id: number; x: number; y: number } | undefined;
  const previewTarget = new THREE.Vector3();
  const previewOrbit = new THREE.Spherical();
  function setState(next: SessionState, message?: string) {
    state = next;
    if (!abort.signal.aborted) onState(next, message);
  }
  function stopPlayback() { media?.pause(); }
  function fail(error: unknown) {
    if (abort.signal.aborted) return;
    stopPlayback();
    if (ownsXR) { xr?.stop(); ownsXR = false; xr?.clearCameraPipelineModules(); }
    const text = error instanceof Error ? error.message : typeof error === 'string' ? error : 'AR could not start. Check camera permission and try again.';
    setState('error', text);
  }
  function checkAlive() { if (abort.signal.aborted) throw new DOMException('Session closed', 'AbortError'); }
  async function prepareMedia(path: string, video: boolean) {
    const element = document.createElement(video ? 'video' : 'audio');
    media = element;
    element.preload = 'auto';
    element.loop = false;
    element.crossOrigin = 'anonymous';
    element.setAttribute('playsinline', '');
    element.setAttribute('webkit-playsinline', '');
    element.setAttribute('aria-hidden', 'true');
    element.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;pointer-events:none;';
    document.body.appendChild(element);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => done(new Error('Content loading timed out. Check the connection and retry.')), 45000);
      function done(error?: Error) {
        clearTimeout(timer); element.removeEventListener('loadeddata', loaded); element.removeEventListener('error', failed); abort.signal.removeEventListener('abort', aborted);
        if (error) reject(error); else resolve();
      }
      const loaded = () => done();
      const failed = () => done(new Error(video ? 'This video could not load or its codec is unsupported.' : 'Audio could not load.'));
      const aborted = () => done(new DOMException('Session closed', 'AbortError'));
      element.addEventListener('loadeddata', loaded, { once: true });
      element.addEventListener('error', failed, { once: true });
      abort.signal.addEventListener('abort', aborted, { once: true });
      element.src = path;
      element.load();
    });
    checkAlive();
    element.addEventListener('error', () => fail(new Error('Media playback failed. Please retry.')), { signal: abort.signal });
    element.addEventListener('ended', () => {
      if (state !== 'playing') return;
      onProgress(1); setState('completed'); onComplete();
    }, { signal: abort.signal });
    return element;
  }
  function update() {
    if (abort.signal.aborted) return;
    if (state === 'playing' && media) {
      mixer?.setTime(media.currentTime);
      const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : spot.contentDurationSeconds;
      const progress = duration ? Math.min(.999, media.currentTime / duration) : 0;
      if (Math.abs(media.currentTime - reportedTime) > .05) { reportedTime = media.currentTime; onProgress(progress); }
    }
  }
  function setupScene() {
    if (!scene || !camera) return;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x637584, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(1, 3, 2); scene.add(light);
    scene.add(root);
    root.visible = placed;
    observer = new ResizeObserver(() => {
      if (!renderer || !camera || abort.signal.aborted) return;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      renderer.setSize(width, height, false);
      if (mode === 'preview') { camera.aspect = width / height; camera.updateProjectionMatrix(); }
    });
    observer.observe(canvas);
  }
  function screenRay(event: PointerEvent) {
    if (!camera) return;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
  }
  function pointerDown(event: PointerEvent) {
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) { drag = undefined; previewDrag = undefined; return; }
    if (!placed || !tracking || event.button !== 0) return;
    if (mode === 'preview') {
      previewDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    screenRay(event);
    if (!raycaster.intersectObject(root, true).length) return;
    const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return;
    drag = { id: event.pointerId, offset: root.position.clone().sub(hit) };
    canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent) {
    if (mode === 'preview') {
      if (!previewDrag || previewDrag.id !== event.pointerId || activePointers.size !== 1 || !camera) return;
      previewOrbit.theta -= (event.clientX - previewDrag.x) * .008;
      previewOrbit.phi = THREE.MathUtils.clamp(previewOrbit.phi - (event.clientY - previewDrag.y) * .008, .15, Math.PI - .15);
      camera.position.setFromSpherical(previewOrbit).add(previewTarget);
      camera.lookAt(previewTarget);
      previewDrag.x = event.clientX; previewDrag.y = event.clientY;
      return;
    }
    if (!drag || drag.id !== event.pointerId || activePointers.size !== 1 || !tracking) return;
    screenRay(event);
    const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit || !camera || hit.distanceTo(camera.position) > 8) return;
    root.position.x = hit.x + drag.offset.x;
    root.position.z = hit.z + drag.offset.z;
  }
  function pointerUp(event: PointerEvent) {
    activePointers.delete(event.pointerId);
    if (drag?.id === event.pointerId) drag = undefined;
    if (previewDrag?.id === event.pointerId) previewDrag = undefined;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener('pointerdown', pointerDown, { signal: abort.signal });
  canvas.addEventListener('pointermove', pointerMove, { signal: abort.signal });
  canvas.addEventListener('pointerup', pointerUp, { signal: abort.signal });
  canvas.addEventListener('pointercancel', pointerUp, { signal: abort.signal });
  canvas.addEventListener('lostpointercapture', pointerUp, { signal: abort.signal });
  canvas.addEventListener('pointerleave', event => { if (!canvas.hasPointerCapture(event.pointerId)) pointerUp(event); }, { signal: abort.signal });

  return {
    async start() {
      try {
        setState('loading', 'Loading content…');
        if (mode === 'ar' && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)) throw new Error('AR needs HTTPS or localhost. Open a secure address on your phone.');
        if (spot.assetType === 'video') {
          if (!spot.videoPath) throw new Error('Content for this point is not available yet.');
          const video = await prepareMedia(spot.videoPath, true) as HTMLVideoElement;
          videoTexture = new THREE.VideoTexture(video);
          videoTexture.colorSpace = THREE.SRGBColorSpace;
          const width = spot.videoWidthMeters * spot.scale;
          const height = width * video.videoHeight / video.videoWidth;
          const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide, toneMapped: false }));
          screen.position.y = height / 2;
          root.add(screen);
        } else {
          if (!spot.modelPath || !spot.audioPath) throw new Error('Content for this point is not available yet.');
          const gltf = await new GLTFLoader().loadAsync(spot.modelPath);
          if (abort.signal.aborted) { disposeObject(gltf.scene); return; }
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const scale = spot.modelSizeMeters * spot.scale / Math.max(size.x, size.y, size.z, .001);
          gltf.scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
          gltf.scene.scale.setScalar(scale);
          root.add(gltf.scene);
          if (gltf.animations.length) {
            mixer = new THREE.AnimationMixer(gltf.scene);
            for (const clip of gltf.animations) { const action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play(); actions.push(action); }
            mixer.setTime(0);
          }
          await prepareMedia(spot.audioPath, false);
        }
        checkAlive();
        if (mode === 'preview') {
          renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
          renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
          renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
          scene = new THREE.Scene(); scene.background = new THREE.Color('#e4e8e7');
          camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, .01, 100);
          new THREE.Box3().setFromObject(root).getCenter(previewTarget);
          camera.position.copy(previewTarget).add(new THREE.Vector3(0, .45, 2.3));
          camera.lookAt(previewTarget);
          previewOrbit.setFromVector3(camera.position.clone().sub(previewTarget));
          placed = true; setupScene();
          setState('ready', 'Preview · drag to rotate');
          const draw = () => { if (abort.signal.aborted) return; update(); renderer!.render(scene!, camera!); previewFrame = requestAnimationFrame(draw); };
          draw(); return;
        }
        setState('loading', 'Loading AR engine…');
        xr = await loadEngine(); checkAlive();
        xr.clearCameraPipelineModules();
        xr.XrController.configure({ disableWorldTracking: false, scale: 'responsive' });
        ownsXR = true;
        xr.addCameraPipelineModules([
          xr.GlTextureRenderer.pipelineModule(), xr.Threejs.pipelineModule(), xr.XrController.pipelineModule(),
          {
            name: 'bridge-content',
            onStart: () => {
              if (abort.signal.aborted) return;
              const xrScene = xr!.Threejs.xrScene();
              scene = xrScene.scene; camera = xrScene.camera; renderer = xrScene.renderer;
              camera.position.set(0, 1.5, 0);
              xr!.XrController.updateCameraProjectionMatrix({ origin: camera.position, facing: camera.quaternion });
              setupScene(); setState('placing', 'Point toward the ground and move slowly.');
            },
            onCameraStatusChange: ({ status }) => {
              if (status === 'requesting') setState('camera', 'Allow camera access to continue.');
              if (status === 'failed') fail(new Error('Camera unavailable. Check browser permissions and retry.'));
            },
            onUpdate: ({ processCpuResult }) => {
              if (abort.signal.aborted || state === 'error' || !camera) return;
              tracking = processCpuResult?.reality?.trackingStatus === 'NORMAL';
              if (!placed && tracking && ++frameCount % 8 === 0) {
                const hits = xr!.XrController.hitTest(.5, .72, ['FEATURE_POINT']);
                const hit = hits.find(h => h.distance > .4 && h.distance < 4 && h.position.y < camera!.position.y - .25);
                if (hit) {
                  root.position.set(hit.position.x, hit.position.y, hit.position.z);
                  plane.constant = -hit.position.y;
                  root.visible = true; placed = true;
                  setState('ready', 'Drag the content to adjust its position.');
                }
              }
              update();
            },
            onException: fail,
          },
        ]);
        canvas.width = Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 2));
        canvas.height = Math.round(canvas.clientHeight * Math.min(devicePixelRatio, 2));
        setState('camera', 'Starting camera…');
        await xr.run({ canvas, allowedDevices: xr.XrConfig.device().ANY, cameraConfig: { direction: xr.XrConfig.camera().BACK } });
      } catch (error) { fail(error); }
    },
    async play() {
      if (!media || !placed || !['ready', 'completed'].includes(state)) return;
      media.currentTime = 0;
      for (const action of actions) action.reset().play();
      mixer?.setTime(0);
      reportedTime = -1; onProgress(0);
      try {
        await media.play();
        if (abort.signal.aborted) { media.pause(); return; }
        setState('playing');
      } catch { setState('ready', 'Playback could not start. Tap Play to try again.'); }
    },
    dispose() {
      abort.abort(); stopPlayback();
      cancelAnimationFrame(previewFrame); observer?.disconnect();
      if (ownsXR) { xr?.stop(); xr?.clearCameraPipelineModules(); ownsXR = false; }
      mixer?.stopAllAction();
      disposeObject(root); videoTexture?.dispose();
      renderer?.dispose();
      media?.removeAttribute('src'); media?.load(); media?.remove();
      scene?.clear(); activePointers.clear();
    },
  };
}
