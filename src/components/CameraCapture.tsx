'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, X } from 'lucide-react';

// Opens the camera, lets you take a square selfie, and hands back a small JPEG.
export function CameraCapture({ onDone, onClose }: { onDone: (photo: Blob) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError('Camera blocked. Allow camera access in your browser, or use Upload instead.'));
    if (!navigator.mediaDevices?.getUserMedia) setError('This browser cannot open the camera. Use Upload instead.');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose]);

  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const side = Math.min(v.videoWidth, v.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 320;
    const ctx = canvas.getContext('2d')!;
    // Mirror it, so the photo looks like the preview.
    ctx.translate(320, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, 320, 320);
    canvas.toBlob((blob) => blob && setShot({ url: URL.createObjectURL(blob), blob }), 'image/jpeg', 0.85);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Take a photo" onClick={(e) => e.stopPropagation()} className="flex w-full max-w-sm flex-col gap-4 rounded-[28px] border-2 border-ink bg-white p-5 shadow-marker">
        <div className="flex items-center justify-between">
          <h2 className="m-0 font-display text-xl font-extrabold">Take a photo</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink text-ink hover:bg-marker">
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shot && <img src={shot.url} alt="Your photo" className="absolute inset-0 h-full w-full object-cover" />}
          <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${shot ? 'invisible' : ''}`} />
          {!shot && !error && <span className="pointer-events-none absolute inset-6 rounded-full border-2 border-dashed border-white/50" aria-hidden />}
          {error && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-300">{error}</p>}
        </div>

        {shot ? (
          <div className="flex gap-2.5">
            <button type="button" onClick={() => setShot(null)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-ink text-sm font-bold hover:bg-marker">
              <RotateCcw size={15} aria-hidden /> Retake
            </button>
            <button type="button" onClick={() => onDone(shot.blob)} className="h-12 flex-1 rounded-full bg-ink text-sm font-bold text-paper hover:bg-neutral-800">
              Use photo
            </button>
          </div>
        ) : (
          <button type="button" onClick={capture} disabled={!!error} className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-paper hover:bg-neutral-800 disabled:opacity-40">
            <Camera size={16} aria-hidden /> Capture
          </button>
        )}
      </div>
    </div>
  );
}
