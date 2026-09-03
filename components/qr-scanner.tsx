'use client';
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X } from 'lucide-react';
import { bridges } from '@/lib/bridge-config';

export default function QRScanner({ onClose, onScan }: { onClose: () => void; onScan: (path: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState('Starting camera…');
  const [failed, setFailed] = useState(false);
  const scanned = useRef(onScan);
  useEffect(() => { scanned.current = onScan; }, [onScan]);
  useEffect(() => {
    dialog.current?.showModal();
    let cancelled = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => stream?.getTracks().forEach(track => track.stop());
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera requires HTTPS or localhost.');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) { stop(); return; }
        const player = video.current;
        if (!player) { stop(); return; }
        player.srcObject = stream;
        await player.play();
        if (cancelled) { stop(); return; }
        setMessage('Point your camera at a bridge QR code.');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('QR scanning is unavailable in this browser.');
        function read() {
          if (cancelled) return;
          if (player!.readyState >= 2 && player!.videoWidth) {
            canvas.width = Math.min(640, player!.videoWidth);
            canvas.height = Math.round(canvas.width * player!.videoHeight / player!.videoWidth);
            ctx!.drawImage(player!, 0, 0, canvas.width, canvas.height);
            const pixels = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(pixels.data, canvas.width, canvas.height);
            if (result) {
              let path = '';
              try { path = new URL(result.data, window.location.origin).pathname.replace(/\/$/, ''); } catch { /* Invalid QR */ }
              const known = bridges.some(b => b.spots.some(s => s.destination === path));
              if (known) { stop(); scanned.current(path); return; }
              setMessage('This QR is not a recognised bridge point. Try another.');
            }
          }
          timer = setTimeout(read, 180);
        }
        read();
      } catch (error) {
        stop();
        if (!cancelled) {
          setFailed(true);
          setMessage(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Camera access denied. Allow camera access in your browser and try again.' : error instanceof Error ? error.message : 'Camera unavailable.');
        }
      }
    }
    void start();
    return () => { cancelled = true; if (timer) clearTimeout(timer); stop(); };
  }, []);
  return <dialog ref={dialog} className="scanner-dialog" onCancel={e => { e.preventDefault(); onClose(); }}>
    <button className="scanner-close" aria-label="Close scanner" onClick={onClose}><X size={22} /></button>
    <h2>SCAN QR</h2>
    {!failed && <video ref={video} muted playsInline className="scanner-video" />}
    <p role="status">{message}</p>
  </dialog>;
}
