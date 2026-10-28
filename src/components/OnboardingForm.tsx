'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Check, ImageUp, Lock, Shuffle, Trash2 } from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { CameraCapture } from './CameraCapture';
import { BIO_MAX, GENDERS, LANGUAGES, MAX_LANGUAGES } from '@/lib/profile-options';

interface Profile {
  handle: string;
  avatarUrl: string | null;
  bio: string;
  languages: string[];
  gender: string;
  ageVerified: boolean;
}

const field = 'pl-field h-12 rounded-2xl border-2 border-ink bg-paper px-4 text-[15px]';

// Center-crop to a square and re-encode as a small JPEG in the browser. This
// keeps uploads tiny and strips hidden data such as GPS location (EXIF).
async function toAvatarJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read that picture.'));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 320;
    canvas.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 320, 320);
    for (const q of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size <= 200 * 1024) return blob;
    }
    throw new Error('That picture is too large.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function OnboardingForm({ campus, campusType, editing, initial }: { campus: string; campusType: string; editing: boolean; initial: Profile }) {
  const router = useRouter();
  const [p, setP] = useState<Profile>(initial);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setSaved(false);
    setP((x) => ({ ...x, [k]: v }));
  };

  async function shuffle() {
    const res = await fetch('/api/profile');
    if (res.ok) set('handle', ((await res.json()) as { handle: string }).handle);
  }

  async function uploadPhoto(make: () => Promise<Blob>) {
    setPhotoBusy(true);
    setError('');
    try {
      const blob = await make();
      const res = await fetch('/api/profile/avatar', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
      const data = await (res.json() as Promise<Record<string, any>>).catch(() => ({}) as Record<string, any>);
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      set('avatarUrl', data.avatarUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const onPhoto = (file: File | undefined) => file && uploadPhoto(() => toAvatarJpeg(file));
  const onCameraPhoto = (blob: Blob) => {
    setCameraOpen(false);
    uploadPhoto(async () => blob);
  };

  async function removePhoto() {
    const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
    if (res.ok) set('avatarUrl', null);
  }

  function toggleLanguage(l: string) {
    setSaved(false);
    setP((x) => {
      if (x.languages.includes(l)) return { ...x, languages: x.languages.filter((y) => y !== l) };
      return x.languages.length >= MAX_LANGUAGES ? x : { ...x, languages: [...x.languages, l] };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p.ageVerified || busy) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    const data = await (res.json() as Promise<Record<string, any>>).catch(() => ({}) as Record<string, any>);
    setBusy(false);
    if (!res.ok) return setError(data.error || 'Could not save your profile.');
    if (editing) {
      setSaved(true);
      router.refresh();
    } else router.push('/roulette');
  }

  const meta = [campusType, ...p.languages].join(' · ');

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="border-b-[1.5px] border-neutral-200">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo href={editing ? '/roulette' : '/'} />
          <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-marker px-3 py-1 text-xs font-bold text-ink">
            <Check size={12} strokeWidth={3} aria-hidden /> Verified, {campus}
          </span>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-10 sm:py-12">
        <div className="flex w-full max-w-[580px] flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium tracking-[0.02em] text-neutral-500">{editing ? 'YOUR PROFILE' : 'ALMOST THERE'}</span>
            <h1 className="m-0 font-display text-[34px] font-extrabold leading-tight tracking-[-0.02em]">{editing ? 'Edit your profile' : 'Set up your anonymous profile'}</h1>
            <p className="text-[15px] leading-relaxed text-neutral-600">No real names here. People see only your ID, picture and one line about you.</p>
          </div>

          {/* What a stranger sees */}
          <div className="flex items-center gap-3.5 rounded-3xl bg-ink p-5 text-paper shadow-marker-sm">
            <Avatar url={p.avatarUrl} name={p.handle} size={52} />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[0.06em] text-neutral-500">WHAT STRANGERS SEE</span>
              <span className="text-[15px] font-semibold">{p.handle}</span>
              <span className="text-xs text-neutral-400">{meta}</span>
              <span className="truncate text-[13px] text-neutral-200">{p.bio || 'Your one-line icebreaker shows here'}</span>
            </span>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-[22px] rounded-[28px] border-2 border-ink bg-white p-5 shadow-marker sm:p-8">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Anonymous ID</span>
              <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-paper px-4 py-2.5">
                <span className="text-[16px] font-bold">{p.handle}</span>
                <button type="button" onClick={shuffle} className="inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-white px-3.5 text-[13px] font-bold hover:bg-marker">
                  <Shuffle size={14} aria-hidden /> Shuffle
                </button>
              </div>
              <span className="text-xs text-neutral-500">Made up for you, so nobody can tell who you are. Shuffle until you like one.</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Profile picture <span className="font-normal text-neutral-500">(optional, change any time)</span></span>
              <div className="flex flex-wrap items-center gap-2.5">
                <Avatar url={p.avatarUrl} name={p.handle} size={64} light className="mr-1" />
                <button type="button" onClick={() => setCameraOpen(true)} disabled={photoBusy} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-bold text-paper hover:bg-neutral-800 disabled:opacity-40">
                  <Camera size={15} aria-hidden /> Take photo
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="ob-photo" onChange={(e) => onPhoto(e.target.files?.[0])} />
                <label htmlFor="ob-photo" className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-ink px-4 text-[13px] font-bold hover:bg-marker">
                  <ImageUp size={15} aria-hidden /> {photoBusy ? 'Uploading...' : 'Upload'}
                </label>
                {p.avatarUrl && (
                  <button type="button" onClick={removePhoto} aria-label="Remove picture" className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-ink text-ink hover:bg-marker">
                    <Trash2 size={15} aria-hidden />
                  </button>
                )}
              </div>
              <span className="text-xs text-neutral-500">A selfie, a cartoon, anything you like. Nudity or someone else&apos;s photo gets you banned.</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="ob-bio" className="text-[13px] font-medium">One line about you <span className="font-normal text-neutral-500">(icebreaker)</span></label>
                <span className="text-xs text-neutral-500">{p.bio.length}/{BIO_MAX}</span>
              </div>
              <input id="ob-bio" maxLength={BIO_MAX} placeholder="Ask me about case comps, cricket or chai" value={p.bio} onChange={(e) => set('bio', e.target.value)} className={field} />
              <span className="text-xs text-neutral-500">No phone numbers, Instagram IDs or links.</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] font-medium">Languages you speak <span className="font-normal text-neutral-500">(up to {MAX_LANGUAGES})</span></span>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => {
                  const on = p.languages.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleLanguage(l)}
                      className={`h-10 rounded-full border-[1.5px] px-4 text-[13px] font-medium ${on ? 'border-ink bg-marker font-bold text-ink' : 'border-neutral-300 bg-white text-neutral-700 hover:border-ink'}`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="ob-gender" className="flex items-center gap-1.5 text-[13px] font-medium">
                Gender <span className="inline-flex items-center gap-1 font-normal text-neutral-500"><Lock size={12} aria-hidden /> private, never shown</span>
              </label>
              <select id="ob-gender" value={p.gender} onChange={(e) => set('gender', e.target.value)} className={field}>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-ink bg-paper px-4 py-3.5">
              <input type="checkbox" checked={p.ageVerified} onChange={(e) => set('ageVerified', e.target.checked)} className="mt-0.5 h-[18px] w-[18px] accent-ink" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">I confirm I am 18 or older</span>
                <span className="text-[13px] leading-normal text-neutral-600">and I agree to the Safety Guidelines. Violations lead to a permanent campus-wide ban.</span>
              </span>
            </label>

            {error && <p className="text-[13px] text-danger">{error}</p>}
            <button
              type="submit"
              disabled={!p.ageVerified || busy}
              className="flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-ink text-[17px] font-bold text-paper hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500"
            >
              {!p.ageVerified ? 'Confirm 18+ to continue' : busy ? 'Saving...' : editing ? (saved ? 'Saved' : 'Save changes') : (<>Chalo, Milte Hain <ArrowRight size={16} aria-hidden /></>)}
            </button>
            {editing && (
              <a href="/roulette" className="self-center text-[13px] font-medium text-neutral-600">Back to calls</a>
            )}
          </form>
        </div>
      </main>
      {cameraOpen && <CameraCapture onDone={onCameraPhoto} onClose={() => setCameraOpen(false)} />}
    </div>
  );
}
