"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Point = { lat: number; lon: number };
type Trigger = Point & { name: string; angle: number };
type Phase = 1 | 2 | 3;

const DIRECTIONS = [
  ["N", 0], ["NE", 45], ["E", 90], ["SE", 135],
  ["S", 180], ["SW", 225], ["W", 270], ["NW", 315],
] as const;
const EARTH = 6378137;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function destination(p: Point, bearing: number, metres = 8): Point {
  const d = metres / EARTH;
  const b = bearing * Math.PI / 180;
  const lat1 = p.lat * Math.PI / 180;
  const lon1 = p.lon * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
}

function distance(a: Point, b: Point) {
  const p1 = a.lat * Math.PI / 180;
  const p2 = b.lat * Math.PI / 180;
  const dp = (b.lat - a.lat) * Math.PI / 180;
  const dl = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function MapTiles({ center }: { center: Point }) {
  const zoom = 18;
  const n = 2 ** zoom;
  const x = (center.lon + 180) / 360 * n;
  const latRad = center.lat * Math.PI / 180;
  const y = (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n;
  const xi = Math.floor(x), yi = Math.floor(y);
  const tiles = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const left = `calc(50% + ${(dx - (x - xi)) * 256}px)`;
    const top = `calc(50% + ${(dy - (y - yi)) * 256}px)`;
    tiles.push(<img key={`${dx}-${dy}`} className="map-tile" alt="" src={`https://tile.openstreetmap.org/${zoom}/${xi + dx}/${yi + dy}.png`} style={{ left, top }} />);
  }
  return <div className="tiles" aria-hidden="true">{tiles}</div>;
}

function PhaseOne({ onComplete }: { onComplete: () => void }) {
  const [locationActive, setLocationActive] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);
  const [origin, setOrigin] = useState<Point | null>(null);
  const [accuracy, setAccuracy] = useState(0);
  const [status, setStatus] = useState("Finding your location…");
  const [nearest, setNearest] = useState<{ trigger: Trigger; distance: number } | null>(null);
  const [demo, setDemo] = useState(false);
  const watch = useRef<number | null>(null);

  const triggers = useMemo(() => origin ? DIRECTIONS.map(([name, angle]) => ({ ...destination(origin, angle), name, angle })) : [], [origin]);

  const update = useCallback((p: Point, acc: number) => {
    setPosition(p); setAccuracy(acc);
    setOrigin((old) => old ?? p);
    setStatus(acc > 18 ? "Weak GPS signal" : "Walk to a point");
  }, []);

  useEffect(() => {
    if (!locationActive) return;
    if (!navigator.geolocation) { setStatus("GPS unavailable"); return; }
    watch.current = navigator.geolocation.watchPosition(
      ({ coords }) => update({ lat: coords.latitude, lon: coords.longitude }, coords.accuracy),
      () => setStatus("Allow location access"),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 },
    );
    return () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); };
  }, [update, locationActive]);

  useEffect(() => {
    if (!position || !triggers.length) return;
    const ranked = triggers.map(trigger => ({ trigger, distance: distance(position, trigger) })).sort((a, b) => a.distance - b.distance);
    setNearest(ranked[0]);
    const radius = Math.min(6, Math.max(3.5, accuracy * 0.45));
    if (ranked[0].distance <= radius) onComplete();
  }, [position, triggers, accuracy, onComplete]);

  const reset = () => {
    if (position) { setOrigin(position); setStatus("Points reset"); }
  };

  const simulate = () => {
    if (!origin) {
      const sample = { lat: 51.5074, lon: -0.1278 };
      setPosition(sample); setOrigin(sample); setDemo(true); setStatus("Demo location");
      return;
    }
    setPosition(destination(origin, 0, 7.8)); setDemo(true);
  };

  const center = position ?? { lat: 51.5074, lon: -0.1278 };
  return <main className="screen map-screen">
    <MapTiles center={center} />
    <div className="map-shade" />
    <header className="topbar"><span /><button className="icon-button" onClick={reset} disabled={!position} aria-label="Reset points">↻</button></header>
    <section className="map-copy">
      <h1>Find a point</h1>
      <p>{status}</p>
    </section>
    <div className="radar" aria-label="Eight trigger points around your location">
      <div className="range range-one"/><div className="range range-two"/>
      {DIRECTIONS.map(([name, angle]) => <div key={name} className="trigger" style={{ transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(-112px) rotate(${-angle}deg)` }}><span>{name}</span></div>)}
      <div className="you"><i /></div>
    </div>
    <div className="map-footer">
      <div className="distance-card">
        <div><span>Nearest</span><strong>{nearest ? `${nearest.trigger.name} · ${nearest.distance.toFixed(1)}m` : "Locating…"}</strong></div>
        <div className="accuracy">±{accuracy ? Math.round(accuracy) : "–"}m</div>
      </div>
      <button className="text-button" onClick={simulate}>{demo ? "Enter point" : "Demo"}</button>
      <p className="attribution">© OpenStreetMap contributors</p>
    </div>
    {!locationActive && <div className="permission-gate">
      <div>
        <h1>Enable location</h1>
        <p>Location is used to place eight points around you.</p>
        <button className="primary" onClick={() => setLocationActive(true)}>Allow location <span>→</span></button>
      </div>
    </div>}
  </main>;
}

function PhaseTwo({ onStart }: { onStart: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState("Starting camera…");
  const [opacity, setOpacity] = useState(0.42);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(s => { if (!active) { s.getTracks().forEach(t => t.stop()); return; } stream.current = s; if (video.current) { video.current.srcObject = s; video.current.play(); } setCameraState("Match the outline"); })
      .catch(() => setCameraState("Allow camera access"));
    return () => { active = false; stream.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  return <main className="screen camera-screen">
    <video ref={video} playsInline muted className="camera-feed" />
    <div className="camera-fallback" />
    <section className="camera-copy"><h1>Find it</h1><p>{cameraState}</p></section>
    <div className="guide-wrap">
      <img src={`${BASE_PATH}/ref.png`} alt="Object alignment guide" className="guide-image" style={{ opacity }} />
      <div className="guide-corners"><i/><i/><i/><i/></div>
    </div>
    <div className="camera-controls">
      <label>Guide <input type="range" min="0.15" max="0.75" step="0.01" value={opacity} onChange={e => setOpacity(Number(e.target.value))} /></label>
      <button className="primary" onClick={onStart}>Start AR <span>→</span></button>
    </div>
  </main>;
}

function PhaseThree({ onBack }: { onBack: () => void }) {
  const [ready, setReady] = useState(false);
  const ModelViewer = "model-viewer" as React.ElementType;
  useEffect(() => { import("@google/model-viewer").then(() => setReady(true)); }, []);
  return <main className="screen ar-screen">
    <header className="topbar"><button className="back" onClick={onBack}>←</button></header>
    <section className="ar-copy"><h1>Place it</h1><p>Scan the ground, then place it ahead.</p></section>
    {ready ? <ModelViewer
      src={`${BASE_PATH}/assets_v2-1.glb`}
      alt="Bridge object in AR"
      camera-controls
      touch-action="pan-y"
      shadow-intensity="1.2"
      exposure="1"
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-placement="floor"
      environment-image="neutral"
      camera-orbit="25deg 72deg auto"
      min-camera-orbit="auto 20deg auto"
      max-camera-orbit="auto 88deg auto"
    ><button slot="ar-button" className="primary ar-button">Place ahead <span>↗</span></button></ModelViewer> : <div className="loader">Loading…</div>}
  </main>;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>(1);
  const next = useCallback(() => setPhase(2), []);
  return <>{phase === 1 && <PhaseOne onComplete={next} />}{phase === 2 && <PhaseTwo onStart={() => setPhase(3)} />}{phase === 3 && <PhaseThree onBack={() => setPhase(2)} />}</>;
}
