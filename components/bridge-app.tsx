'use client';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { constrainCamera } from '@/lib/map-camera';
import QRScanner from '@/components/qr-scanner';
import { QRCodeSVG } from 'qrcode.react';
import { X, ScanLine } from 'lucide-react';
import ARExperience from '@/components/ar-experience';
import { Button } from '@/components/ui/button';
import { bridges, type Bridge, type Spot } from '@/lib/bridge-config';
import { readCompletion, writeCompletion } from '@/lib/completion-storage';
import albertMapUrl from '../Assets/Maps/map_AB_v3.png?url';
import hammersmithMapUrl from '../Assets/Maps/map_HB_v3.png?url';

function useCompletion() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    function refresh() {
      try { setCompleted(bridges.flatMap(b => b.spots.filter(s => readCompletion(window.localStorage, b.id, s.id)).map(s => s.destination))); }
      catch { setStorageError(true); }
    }
    refresh(); window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);
  function complete(spot: Spot) {
    setCompleted(items => items.includes(spot.destination) ? items : [...items, spot.destination]);
    try { if (!writeCompletion(window.localStorage, spot.bridgeId, spot.id)) setStorageError(true); }
    catch { setStorageError(true); }
  }
  return { completed, complete, storageError };
}

function QRCode({ spot }: { spot: Spot }) {
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(new URL(spot.destination, window.location.origin).href); }, [spot.destination]);
  return <div className="qr-image">{url && <QRCodeSVG value={url} size={116} marginSize={4} level="M" title={`Open ${spot.title}`} />}</div>;
}

function BridgeMap({ bridge, completed }: { bridge: Bridge; completed: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>();
  const [size, setSize] = useState({ w: 390, h: 844 });
  const home = { zoom: 1, x: bridge.mapWidth / 2, y: bridge.mapHeight * bridge.mapFocusY };
  const [target, setTarget] = useState(home);
  const [view, setView] = useState(home);
  const current = useRef(home);
  const motionDuration = useRef(720);
  const [entering, setEntering] = useState(false);
  const [scanning, setScanning] = useState(false);
  const drag = useRef<{ id: number; px: number; py: number; x: number; y: number; zoom: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number; x: number; y: number } | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imageError, setImageError] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const spot = bridge.spots.find(s => s.id === selected);
  const angle = 0;
  const geometry = { width: size.w, height: size.h, imageWidth: bridge.mapWidth, imageHeight: bridge.mapHeight, angle };
  const camera = constrainCamera(view, geometry);
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    function wheel(e: WheelEvent) {
      e.preventDefault();
      if (pointers.current.size || entering) return;
      motionDuration.current = 280;
      const bounds = node!.getBoundingClientRect();
      const dx = e.clientX - bounds.left - size.w / 2;
      const dy = e.clientY - bounds.top - size.h / 2;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? size.h : 1;
      setTarget(previous => {
        const before = constrainCamera(previous, geometry);
        const zoom = Math.max(1, Math.min(2.6, before.zoom * Math.exp(-Math.max(-150, Math.min(150, e.deltaY * unit)) * .002)));
        const after = constrainCamera({ ...before, zoom }, geometry);
        const offsetX = dx * before.c + dy * before.s;
        const offsetY = -dx * before.s + dy * before.c;
        const next = constrainCamera({ zoom, x: before.x + offsetX / before.scale - offsetX / after.scale, y: before.y + offsetY / before.scale - offsetY / after.scale }, geometry);
        return { zoom: next.zoom, x: next.x, y: next.y };
      });
    }
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [size.w, size.h, bridge, entering]);
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const from = constrainCamera(current.current, geometry);
    const destination = constrainCamera(target, geometry);
    const start = performance.now();
    const duration = motionDuration.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    function tick(now: number) {
      const t = reduced ? 1 : Math.min(1, (now - start) / duration);
      const ease = duration >= 720 ? t * t * (3 - 2 * t) : 1 - Math.pow(1 - t, 3);
      const next = { zoom: from.zoom + (destination.zoom - from.zoom) * ease, x: from.x + (destination.x - from.x) * ease, y: from.y + (destination.y - from.y) * ease };
      current.current = next;
      setView(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  useEffect(() => () => { if (navigationTimer.current) clearTimeout(navigationTimer.current); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelected(undefined); setTarget({ zoom: 1, x: bridge.mapWidth / 2, y: bridge.mapHeight * bridge.mapFocusY }); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bridge]);
  function project(point: Spot) {
    const dx = point.position.x * bridge.mapWidth - camera.x, dy = point.position.y * bridge.mapHeight - camera.y;
    return { left: size.w / 2 + (dx * camera.c - dy * camera.s) * camera.scale, top: size.h / 2 + (dx * camera.s + dy * camera.c) * camera.scale };
  }
  function focus(point: Spot, zoom = 1.65) {
    motionDuration.current = 850;
    const focused = constrainCamera({ ...target, zoom }, geometry);
    const dx = size.w > 700 ? -130 : 0;
    const dy = size.w > 700 ? 0 : -105;
    setTarget({ zoom, x: point.position.x * bridge.mapWidth - (dx * focused.c + dy * focused.s) / focused.scale, y: point.position.y * bridge.mapHeight - (-dx * focused.s + dy * focused.c) / focused.scale });
  }
  function startDrag(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || entering) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const bounds = e.currentTarget.getBoundingClientRect();
        const dx = (a.x + b.x) / 2 - bounds.left - size.w / 2;
        const dy = (a.y + b.y) / 2 - bounds.top - size.h / 2;
        pinch.current = { distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), zoom: camera.zoom,
          x: camera.x + dx / camera.scale, y: camera.y + dy / camera.scale };
      }
      drag.current = null;
      suppressClick.current = true;
      for (const id of pointers.current.keys()) e.currentTarget.setPointerCapture(id);
      return;
    }
    suppressClick.current = false;
    drag.current = { id: e.pointerId, px: e.clientX, py: e.clientY, x: camera.x, y: camera.y, zoom: camera.zoom, moved: false };
  }
  function moveDrag(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const p = pinch.current;
      const bounds = e.currentTarget.getBoundingClientRect();
      const zoom = Math.max(1, Math.min(2.6, p.zoom * Math.hypot(b.x - a.x, b.y - a.y) / p.distance));
      const scaled = constrainCamera({ zoom, x: p.x, y: p.y }, geometry);
      const next = constrainCamera({ zoom,
        x: p.x - ((a.x + b.x) / 2 - bounds.left - size.w / 2) / scaled.scale,
        y: p.y - ((a.y + b.y) / 2 - bounds.top - size.h / 2) / scaled.scale }, geometry);
      motionDuration.current = 50;
      setTarget({ zoom: next.zoom, x: next.x, y: next.y });
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.px, dy = e.clientY - d.py;
    if (Math.hypot(dx, dy) > 5) {
      d.moved = true;
      suppressClick.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    motionDuration.current = 90;
    const next = constrainCamera({ zoom: d.zoom, x: d.x - (dx * camera.c + dy * camera.s) / camera.scale, y: d.y - (-dx * camera.s + dy * camera.c) / camera.scale }, geometry);
    setTarget({ zoom: next.zoom, x: next.x, y: next.y });
  }
  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(e.pointerId)) return;
    suppressClick.current = suppressClick.current || !!drag.current?.moved || !!pinch.current;
    pinch.current = null;
    drag.current = null;
    // Continue with one finger without jumping back to the pre-pinch camera.
    if (pointers.current.size === 1) {
      const [id, point] = [...pointers.current.entries()][0];
      const visible = constrainCamera(current.current, geometry);
      motionDuration.current = 50;
      setTarget({ zoom: visible.zoom, x: visible.x, y: visible.y });
      drag.current = { id, px: point.x, py: point.y, x: visible.x, y: visible.y, zoom: visible.zoom, moved: true };
    } else if (pointers.current.size > 1) {
      pointers.current.clear();
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const anchor = spot ? project(spot) : { left: 0, top: 0 };
  const panelWidth = Math.min(350, size.w - 32);
  const panelLeft = Math.max(16, Math.min(size.w - panelWidth - 16, size.w > 700 ? anchor.left + 38 : anchor.left - panelWidth / 2));
  const panelTop = Math.max(106, Math.min(size.h - 430, size.w > 700 ? anchor.top - 140 : anchor.top + 40));
  return <section className={`map-screen ${entering ? 'map-leaving' : ''}`} aria-label={`${bridge.title} map`}>
    <div ref={surface} className="map-surface" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) endDrag(e); }} onLostPointerCapture={e => { if (e.target === e.currentTarget) endDrag(e); }} onDragStart={e => e.preventDefault()}>
      <div className="map-plane" style={{ left: size.w / 2, top: size.h / 2, transform: `rotate(${angle}rad) scale(${camera.scale})` }}>
        <img src={bridge.mapPath} alt={`${bridge.title} topographic map`} width={bridge.mapWidth} height={bridge.mapHeight} draggable={false} onError={() => setImageError(true)} style={{ left: -camera.x, top: -camera.y, width: bridge.mapWidth, height: bridge.mapHeight }} />
      </div>
      {bridge.spots.map(point => <button key={point.id} className={`map-pin ${selected === point.id ? 'selected' : ''} ${completed.includes(point.destination) ? 'completed' : ''}`} style={project(point)} aria-label={`${point.title}${completed.includes(point.destination) ? ', test completed' : ''}`} aria-pressed={selected === point.id}
        onClick={e => { if (e.detail !== 0 && suppressClick.current) return; setSelected(point.id); focus(point); }}>
        <span>{point.pinId}</span>{completed.includes(point.destination) && <i aria-hidden="true" />}
      </button>)}
    </div>
    <header className="map-heading"><h1>{bridge.title}</h1></header>
    <Button className="scan-qr-button" onClick={() => setScanning(true)}><ScanLine size={24} /> SCAN QR</Button>
    {scanning && <QRScanner onClose={() => setScanning(false)} onScan={path => {
      setScanning(false); setEntering(true);
      navigationTimer.current = setTimeout(() => router.push(path), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380);
    }} />}
    {imageError && <p className="notice" role="alert">Map image unavailable.</p>}
    {spot && <section key={spot.id} className="point-overlay" style={{ left: panelLeft, top: panelTop, width: panelWidth }} aria-label={`Selected ${spot.title}`}>
      <Button variant="ghost" className="close-point icon-button" aria-label="Close selected point" onClick={() => { surface.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus(); setSelected(undefined); setTarget(home); }}><X /></Button>
      <div className="point-copy"><h2>{spot.title}</h2>{spot.description && <p>{spot.description}</p>}</div>
      <QRCode key={spot.destination} spot={spot} />
      <div className="point-actions"><Link className="enter-link" href={spot.destination} aria-disabled={entering} onClick={e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault(); if (entering) return;
        setEntering(true);
        navigationTimer.current = setTimeout(() => router.push(spot.destination), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380);
      }}>Enter AR</Link></div>
    </section>}
  </section>;
}
export default function BridgeApp({ path }: { path: string[] }) {
  const { completed, complete, storageError } = useCompletion();
  const configuredBridge = bridges.find(b => b.id === path[0]);
  const bridge = configuredBridge ? { ...configuredBridge, mapPath: configuredBridge.id === 'AlbertBridge' ? albertMapUrl : hammersmithMapUrl } : undefined;
  const spot = bridge?.spots.find(s => s.id === path[1]);
  const invalid = !bridge || path.length > 2 || (path.length === 2 && !spot);
  return <main className="app-shell">
    {invalid ? <section className="not-found"><h1>Point not found.</h1><Link href={bridge ? `/${bridge.id}` : '/AlbertBridge'}>Return to map ↗</Link></section>
      : spot ? <ARExperience key={spot.destination} bridge={bridge} spot={spot} complete={complete} />
      : <BridgeMap key={bridge.id} bridge={bridge} completed={completed} />}
    {storageError && <p className="notice" role="status">Completion cannot be saved in this browser.</p>}
  </main>;
}



