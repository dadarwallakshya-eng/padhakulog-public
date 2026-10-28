'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    setBusy(false);
    if (!res.ok) return setError('Wrong password.');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
        <Logo />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="text-sm text-neutral-600">Moderators only.</p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="admin-pw" className="text-[13px] font-medium">Password</label>
          <input id="admin-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-field h-11 rounded-xl border border-neutral-300 px-3 text-sm" />
        </div>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <button type="submit" disabled={busy || !password} className="h-11 rounded-xl bg-neutral-900 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? 'Checking...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
