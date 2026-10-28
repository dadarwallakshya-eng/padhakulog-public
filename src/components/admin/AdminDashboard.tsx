'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Flag, Plus } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

interface Overview {
  metrics: { verified: number; onlineInQueue: number; activeInstitutions: number; totalInstitutions: number; matches: number; skipRate: number; reportRate: number };
  reports: { id: string; reason: string; status: string; outcome: string | null; sessionId: string | null; createdAt: string; reported: { id: string; name: string; campus: string }; reporterCampus: string }[];
  users: { id: string; name: string; campus: string; banned: boolean; online: boolean; lastSeen: string }[];
  institutions: { id: string; name: string; type: string; primaryDomain: string; approvedDomains: string[]; active: boolean }[];
}

const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};
const tabCls = (on: boolean) => `h-[30px] rounded-[9px] px-3 text-[13px] font-semibold ${on ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'}`;

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await (res.json() as Promise<Record<string, any>>).catch(() => ({}) as Record<string, any>) };
}

export function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [reportTab, setReportTab] = useState<'OPEN' | 'RESOLVED'>('OPEN');
  const [userQ, setUserQ] = useState('');
  const [instQ, setInstQ] = useState('');
  const [instTab, setInstTab] = useState('all');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', domain: '', type: 'NIT' });
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/overview');
    if (res.status === 401) return router.refresh();
    if (res.ok) setData(await res.json());
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) return <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-neutral-500">Loading...</div>;
  const m = data.metrics;
  const openCount = data.reports.filter((r) => r.status === 'OPEN').length;
  const bannedCount = data.users.filter((u) => u.banned).length;
  const reports = data.reports.filter((r) => r.status === reportTab);
  const uq = userQ.trim().toLowerCase();
  const users = data.users.filter((u) => !uq || `${u.name} ${u.campus}`.toLowerCase().includes(uq));
  const iq = instQ.trim().toLowerCase();
  const insts = data.institutions.filter((i) => (instTab === 'all' || i.type === instTab) && (!iq || i.name.toLowerCase().includes(iq) || i.approvedDomains.some((d) => d.includes(iq))));

  const metrics = [
    { label: 'Total verified users', value: m.verified.toLocaleString('en-IN'), note: 'All time' },
    { label: 'Online in queue', value: String(m.onlineInQueue), note: 'Waiting for a match', live: true },
    { label: 'Approved institutions', value: String(m.activeInstitutions), note: `${m.totalInstitutions} in registry` },
    { label: 'Matches created', value: m.matches.toLocaleString('en-IN'), note: 'All time' },
    { label: 'Skip rate', value: pct(m.skipRate), note: 'Next pressed under 30s' },
    { label: 'Report rate', value: pct(m.reportRate), note: `${openCount} open, ${bannedCount} banned` },
  ];

  async function addInstitution(e: React.FormEvent) {
    e.preventDefault();
    const r = await post('/api/admin/institutions', { name: form.name, type: form.type, domains: form.domain.split(',') });
    if (!r.ok) return setFormError(r.data.error || 'Could not save.');
    setForm({ name: '', domain: '', type: 'NIT' });
    setFormError('');
    setAdding(false);
    load();
  }

  return (
    <div className="min-h-screen bg-canvas text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <span className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="text-base font-bold tracking-tight">Padhaku <span className="text-collegiate">Log</span></span>
            <span className="rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">Admin</span>
          </span>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/admin/login', { method: 'DELETE' });
              router.refresh();
            }}
            className="text-sm font-medium text-neutral-600"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold tracking-[-0.03em]">Moderation</h1>
          <p className="text-sm text-neutral-600">Live health of the network, registry of approved campuses, and the safety queue.</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          {metrics.map((x) => (
            <div key={x.label} className="flex flex-col gap-2.5 rounded-[18px] border border-neutral-200 bg-white p-[18px]">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-neutral-600">{x.label}</span>
                {x.live && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-verified" />Live</span>}
              </span>
              <span className="text-[28px] font-bold tabular-nums tracking-[-0.03em]">{x.value}</span>
              <span className="text-xs text-neutral-500">{x.note}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <section className="min-w-0 flex-[3_1_520px] overflow-hidden rounded-[20px] border border-neutral-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-[18px]">
              <span className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-red-50 text-danger"><Flag size={16} aria-hidden /></span>
                <h2 className="text-base font-semibold">Safety reports</h2>
              </span>
              <span className="flex gap-1 rounded-xl bg-neutral-100 p-1">
                {(['OPEN', 'RESOLVED'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setReportTab(t)} className={tabCls(reportTab === t)}>
                    {t === 'OPEN' ? 'Open' : 'Resolved'} ({data.reports.filter((r) => r.status === t).length})
                  </button>
                ))}
              </span>
            </div>
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 hover:bg-canvas">
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">{r.reason}</span>
                    {r.sessionId && <span className="font-mono text-xs text-neutral-500">{r.sessionId.slice(-8)}</span>}
                    <span className="text-xs text-neutral-500">{ago(r.createdAt)}</span>
                  </span>
                  <span className="text-sm"><span className="font-semibold">{r.reported.name}</span> <span className="text-neutral-500">({r.reported.campus})</span></span>
                  <span className="text-xs text-neutral-500">Reported by a student at {r.reporterCampus}</span>
                </span>
                {r.status === 'OPEN' ? (
                  <span className="flex gap-2">
                    <button type="button" onClick={async () => { await post('/api/admin/reports', { id: r.id, action: 'ban' }); load(); }} className="h-9 rounded-[10px] border border-red-200 px-3 text-[13px] font-semibold text-red-700 hover:bg-red-50">Ban user</button>
                    <button type="button" onClick={async () => { await post('/api/admin/reports', { id: r.id, action: 'resolve' }); load(); }} className="h-9 rounded-[10px] bg-neutral-900 px-3 text-[13px] font-semibold text-white">Resolve</button>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700"><Check size={14} strokeWidth={2.5} aria-hidden />{r.outcome}</span>
                )}
              </div>
            ))}
            {reports.length === 0 && <p className="px-5 py-8 text-center text-sm text-neutral-500">Queue is clear.</p>}
          </section>

          <section className="min-w-0 flex-[2_1_360px] overflow-hidden rounded-[20px] border border-neutral-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-[18px]">
              <h2 className="text-base font-semibold">User directory</h2>
              <label htmlFor="ad-uq" className="sr-only">Search users</label>
              <input id="ad-uq" type="search" placeholder="Search by name or campus" value={userQ} onChange={(e) => setUserQ(e.target.value)} className="pl-field h-10 rounded-[10px] border border-neutral-300 px-3 text-sm" />
            </div>
            <div className="max-h-[460px] overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3 hover:bg-canvas">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-neutral-100 text-[13px] font-semibold text-neutral-700">{u.name.charAt(0).toUpperCase()}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{u.name}</span>
                      <span className="truncate text-xs text-neutral-500">{u.campus} · {u.online ? 'online now' : ago(u.lastSeen)}</span>
                    </span>
                  </span>
                  <span className="flex flex-none items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${u.banned ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{u.banned ? 'Banned' : 'Active'}</span>
                    <button
                      type="button"
                      onClick={async () => { await post('/api/admin/users', { id: u.id, banned: !u.banned }); load(); }}
                      className={`h-8 min-w-16 rounded-[9px] border px-2.5 text-xs font-semibold hover:bg-neutral-100 ${u.banned ? 'border-neutral-200 text-neutral-900' : 'border-red-200 text-red-700'}`}
                    >
                      {u.banned ? 'Unban' : 'Ban'}
                    </button>
                  </span>
                </div>
              ))}
              {users.length === 0 && <p className="px-5 py-8 text-center text-sm text-neutral-500">No users yet.</p>}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-[20px] border border-neutral-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-[18px]">
            <span className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold">Institution registry</h2>
              <span className="text-[13px] text-neutral-500">{m.activeInstitutions} of {m.totalInstitutions} active. Exact domain match only.</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <label htmlFor="ad-iq" className="sr-only">Search institutions</label>
              <input id="ad-iq" type="search" placeholder="Search campus or domain" value={instQ} onChange={(e) => setInstQ(e.target.value)} className="pl-field h-[38px] w-[220px] rounded-[10px] border border-neutral-300 px-3 text-sm" />
              <span className="flex gap-1 rounded-xl bg-neutral-100 p-1">
                {['all', 'IIT', 'IIM'].map((t) => (
                  <button key={t} type="button" onClick={() => setInstTab(t)} className={tabCls(instTab === t)}>{t === 'all' ? 'All' : `${t}s`}</button>
                ))}
              </span>
              <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] bg-neutral-900 px-3.5 text-[13px] font-semibold text-white">
                <Plus size={14} strokeWidth={2.5} aria-hidden /> Add institution
              </button>
            </span>
          </div>

          {adding && (
            <form onSubmit={addInstitution} className="flex flex-wrap items-end gap-2.5 border-b border-neutral-100 bg-canvas px-5 py-4">
              <span className="flex flex-[2_1_200px] flex-col gap-1.5">
                <label htmlFor="ad-name" className="text-xs font-medium">Name</label>
                <input id="ad-name" placeholder="NIT Trichy" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-field h-[38px] rounded-[10px] border border-neutral-300 px-3 text-sm" />
              </span>
              <span className="flex flex-[2_1_200px] flex-col gap-1.5">
                <label htmlFor="ad-domain" className="text-xs font-medium">Approved domains (comma separated)</label>
                <input id="ad-domain" placeholder="nitt.edu" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="pl-field h-[38px] rounded-[10px] border border-neutral-300 px-3 font-mono text-[13px]" />
              </span>
              <span className="flex flex-[1_1_120px] flex-col gap-1.5">
                <label htmlFor="ad-type" className="text-xs font-medium">Type</label>
                <select id="ad-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="pl-field h-[38px] rounded-[10px] border border-neutral-300 bg-white px-2.5 text-sm">
                  {['IIT', 'IIM', 'NIT', 'BITS', 'IISc', 'ISB', 'XLRI'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </span>
              <button type="submit" className="h-[38px] rounded-[10px] bg-neutral-900 px-4 text-[13px] font-semibold text-white">Save</button>
              {formError && <span className="basis-full text-[13px] text-danger">{formError}</span>}
            </form>
          )}

          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="sticky top-0 bg-white text-left text-xs text-neutral-500">
                  <th className="border-b border-neutral-100 px-5 py-2.5 font-medium">Institution</th>
                  <th className="border-b border-neutral-100 px-3 py-2.5 font-medium">Type</th>
                  <th className="border-b border-neutral-100 px-3 py-2.5 font-medium">Approved domains</th>
                  <th className="border-b border-neutral-100 px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {insts.map((i) => (
                  <tr key={i.id} className="hover:bg-canvas">
                    <td className="border-b border-neutral-100 px-5 py-3 font-medium">{i.name}</td>
                    <td className="border-b border-neutral-100 px-3 py-3"><span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{i.type}</span></td>
                    <td className="border-b border-neutral-100 px-3 py-3 font-mono text-[13px] text-neutral-700">{i.approvedDomains.map((d) => `@${d}`).join(', ')}</td>
                    <td className="border-b border-neutral-100 px-3 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={i.active}
                        aria-label={`Toggle ${i.name}`}
                        onClick={async () => { await post('/api/admin/institutions', { id: i.id, active: !i.active }); load(); }}
                        className={`inline-flex items-center gap-2 text-[13px] font-medium ${i.active ? 'text-emerald-700' : 'text-neutral-500'}`}
                      >
                        <span className={`relative h-5 w-[34px] rounded-full transition-colors ${i.active ? 'bg-verified' : 'bg-neutral-300'}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] ${i.active ? 'left-4' : 'left-0.5'}`} />
                        </span>
                        {i.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
