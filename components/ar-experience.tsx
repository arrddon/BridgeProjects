'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Bridge, Spot } from '@/lib/bridge-config';
import type { Session, SessionState } from '@/lib/ar-session';

export default function ARExperience({ bridge, spot, complete }: { bridge: Bridge; spot: Spot; complete: (s: Spot) => void }) {
  const [state, setState] = useState<SessionState | 'entry'>('entry');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'ar' | 'preview'>('ar');
  const canvas = useRef<HTMLCanvasElement>(null);
  const session = useRef<Session | null>(null);
  const generation = useRef(0);
  const completeRef = useRef(complete);
  useEffect(() => { completeRef.current = complete; }, [complete]);
  useEffect(() => () => { generation.current++; session.current?.dispose(); }, []);
  const available = spot.assetType === 'video'
    ? Boolean(spot.videoPath)
    : spot.assetType === 'image'
      ? Boolean(spot.imagePath && spot.audioPath)
      : Boolean(spot.modelPath && spot.audioPath);
  async function start(nextMode: 'ar' | 'preview') {
    const token = ++generation.current;
    session.current?.dispose(); session.current = null;
    setMode(nextMode); setState('loading'); setProgress(0); setMessage('Loading content…');
    try {
      const { createSession } = await import('@/lib/ar-session');
      if (token !== generation.current || !canvas.current) return;
      const next = createSession({ canvas: canvas.current, spot, mode: nextMode,
        onState: (value, detail) => { if (generation.current === token) { setState(value); setMessage(detail ?? ''); } },
        onProgress: value => { if (generation.current === token) setProgress(value); },
        onComplete: () => { if (generation.current === token && nextMode === 'ar') completeRef.current(spot); },
      });
      session.current = next;
      await next.start();
    } catch {
      if (generation.current === token) { setState('error'); setMessage('The content player could not load. Please retry.'); }
    }
  }
  const active = ['ready', 'playing', 'completed'].includes(state);
  return <section className={`experience-screen live-experience ${state}`} aria-label={`${bridge.title}, ${spot.title}`}>
    <canvas ref={canvas} className="xr-canvas" aria-label={mode === 'ar' ? 'AR camera with spatial content' : '3D content preview'} />
    <header className="ar-heading"><Link href={`/${bridge.id}`} className="back-link"><ArrowLeft size={18} /> Map</Link><span className="micro">{spot.title}</span></header>
    {state === 'entry' && <section className="ar-entry glass-panel">
      <h1>{spot.title}</h1>
      <p>{available ? spot.assetType === 'video' ? 'Place a video in the space around you.' : spot.assetType === 'image' ? 'Place an image in the space around you.' : 'Place the object in the space around you.' : 'Content for this point is not available yet.'}</p>
      {available && <><Button className="play-button" onClick={() => void start('ar')}>Start AR</Button><Button variant="ghost" className="preview-button" onClick={() => void start('preview')}>Preview content</Button></>}
    </section>}
    {['loading', 'camera', 'placing'].includes(state) && <div className="xr-message glass-panel" role="status"><p>{message}</p></div>}
    {state === 'error' && <div className="xr-message glass-panel" role="alert"><p>{message}</p><Button className="play-button" onClick={() => void start(mode)}>Retry</Button><Button variant="ghost" onClick={() => void start('preview')}>Preview content</Button></div>}
    {active && <section className="playback-overlay xr-playback">
      {(mode === 'preview' || message) && <p className="xr-hint">{message || (mode === 'preview' ? 'Content preview · camera off' : '')}</p>}
      <div className="progress" role="progressbar" aria-label="Content playback progress" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress * 100}%` }} /></div>
      <Button className="play-button" disabled={state === 'playing'} onClick={() => void session.current?.play()}>{state === 'completed' ? <RotateCcw size={15} /> : <Play size={15} />}{state === 'completed' ? 'Replay' : state === 'playing' ? 'Playing' : 'Play'}</Button>
      <span className="playback-caption" aria-live="polite">{state === 'completed' ? mode === 'ar' ? 'Complete' : 'Preview complete' : '\u00a0'}</span>
    </section>}
  </section>;
}
