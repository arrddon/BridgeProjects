import * as THREE from 'three';

export type PipelineModule = {
  name: string;
  onStart?: () => void;
  onUpdate?: (args: { processCpuResult?: { reality?: { trackingStatus?: string } } }) => void;
  onException?: (error: unknown) => void;
  onCameraStatusChange?: (args: { status: string }) => void;
};
export type XR8Engine = {
  loadChunk(name: string): Promise<void>;
  addCameraPipelineModules(modules: PipelineModule[]): void;
  clearCameraPipelineModules(): void;
  run(options: { canvas: HTMLCanvasElement; allowedDevices: string; cameraConfig?: { direction: string } }): void | Promise<void>;
  stop(): void;
  Threejs: {
    pipelineModule(): PipelineModule;
    xrScene(): { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer };
  };
  GlTextureRenderer: { pipelineModule(): PipelineModule };
  XrConfig: { device(): { ANY: string }; camera(): { BACK: string } };
  XrController: {
    pipelineModule(): PipelineModule;
    configure(options: { disableWorldTracking: boolean; scale: 'responsive' | 'absolute' }): void;
    updateCameraProjectionMatrix(options: { origin: THREE.Vector3; facing: THREE.Quaternion }): void;
    hitTest(x: number, y: number, types: string[]): { position: { x: number; y: number; z: number }; distance: number; type: string }[];
  };
};
const browser = () => window as unknown as { THREE: typeof THREE; XR8?: XR8Engine };
let enginePromise: Promise<XR8Engine> | undefined;

export function loadEngine(): Promise<XR8Engine> {
  if (enginePromise) return enginePromise;
  browser().THREE = THREE;
  enginePromise = new Promise<XR8Engine>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-bridge-engine]');
    let loading = false;
    const finish = () => {
      if (loading || !browser().XR8) return;
      loading = true;
      browser().XR8!.loadChunk('slam').then(() => { cleanup(); resolve(browser().XR8!); }, fail);
    };
    const fail = () => { cleanup(); script?.remove(); reject(new Error('The AR engine could not load. Check the connection and try again.')); };
    const timer = window.setTimeout(fail, 60000);
    function cleanup() { clearTimeout(timer); window.removeEventListener('xrloaded', finish); script?.removeEventListener('error', fail); }
    window.addEventListener('xrloaded', finish);
    if (browser().XR8) finish();
    else if (!script) {
      script = document.createElement('script');
      script.src = '/vendor/8thwall/xr.js';
      script.async = true;
      script.dataset.bridgeEngine = 'true';
      script.dataset.preloadChunks = 'slam';
      script.addEventListener('error', fail);
      document.head.appendChild(script);
    }
  }).catch(error => { enginePromise = undefined; throw error; });
  return enginePromise;
}
