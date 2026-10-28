'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check, Eye, Flag, GraduationCap, Lock, Mic, MicOff, Pause, PhoneOff, PictureInPicture2, Play, ShieldCheck, SkipForward, SlidersHorizontal, Volume2, VolumeX, UserCheck, UserPlus, Users, Video, VideoOff,
} from 'lucide-react';
import { LogoImage, LogoMark } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import { REPORT_REASONS } from '@/lib/profile-options';
import { FriendsPanel, type Friend } from './FriendsPanel';
import { chime, makeDemoStream, useLocalMedia, useMesh } from './useCall';
import { useLive, type LiveEvent } from './useLive';

type Filter = 'all' | 'IIT' | 'IIM';
type Phase = 'searching' | 'connected' | 'ended' | 'paused' | 'demo';

interface Member {
  id: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  languages: string[];
  institutionType: string;
  isFriend: boolean;
  togetherSince: string;
}
interface Incoming { userId: string; handle: string; avatarUrl: string | null }
interface Invite { id: string; fromHandle: string; others: string[] }
interface MatchState {
  status: 'idle' | 'waiting' | 'matched';
  calling: string | null;
  incoming: Incoming[];
  invites: Invite[];
  notice: string | null;
  session?: { id: string };
  members?: Member[];
}

const FRIEND_SECS = 30;
// Safe start with a new stranger: the picture is blurred for the first seconds
// and their sound only plays after a few more, so nobody is hit with something
// nasty the moment a call opens. Either can be skipped with one tap.
const BLUR_MS = 3000;
const SOUND_MS = 5000;
const SAFE_KEY = 'pl_safe_start';
// A call whose video never came through (or dropped for good) moves on by itself.
const GIVE_UP_MS = 15_000;
const DEMO: Member = { id: 'demo', handle: 'SunnyPanda204', avatarUrl: null, bio: 'Demo match. Real people show up when they are online.', languages: ['Hindi', 'English'], institutionType: 'IIT', isFriend: false, togetherSince: '' };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, data: await (res.json() as Promise<Record<string, any>>).catch(() => ({}) as Record<string, any>) };
}

function VideoEl({ stream, muted, kick = 0, blur, onSoundBlocked }: { stream: MediaStream | null | undefined; muted?: boolean; kick?: number; blur?: boolean; onSoundBlocked?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== (stream ?? null)) ref.current.srcObject = stream ?? null;
  }, [stream]);
  // React doesn't keep the muted attribute in sync, so set it by hand. Browsers
  // may refuse sound until the page has been tapped; then ask for a tap.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = !!muted;
    if (!muted) {
      el.play().catch(() => {
        el.muted = true;
        void el.play().catch(() => {});
        onSoundBlocked?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, kick, stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={`transition-[filter] duration-500 ${blur ? 'blur-2xl' : ''}`} />;
}

function Silhouette() {
  return (
    <svg width="62%" height="82%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMax meet" aria-hidden className="absolute bottom-0 left-1/2 -translate-x-1/2">
      <circle cx="100" cy="78" r="38" fill="rgba(255,255,255,.08)" />
      <path d="M24 200c4-46 36-74 76-74s72 28 76 74z" fill="rgba(255,255,255,.08)" />
    </svg>
  );
}

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-start gap-3 rounded-[12px] px-2.5 py-2.5 text-left hover:bg-neutral-800">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-xs leading-snug text-neutral-400">{hint}</span>
      </span>
      <span className={`mt-0.5 flex h-6 w-10 flex-none items-center rounded-full p-0.5 transition-colors ${on ? 'bg-marker' : 'bg-neutral-700'}`}>
        <span className={`h-5 w-5 rounded-full bg-paper shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  );
}

export function RouletteClient({ me }: { me: { id: string; handle: string; avatarUrl: string | null; campus: string; meetSameCampus: boolean } }) {
  const { stream: localStream, error: mediaError } = useLocalMedia();
  // Live events (WebSocket) drive the page; polling is only a fallback.
  const liveHandler = useRef<(e: LiveEvent) => void>(() => {});
  const live = useLive((e) => liveHandler.current(e));
  const liveRef = useRef(false);
  liveRef.current = live.connected;
  const mesh = useMesh(me.id, localStream, live.connected);
  const tickRef = useRef<() => void>(() => {});
  const [chatBump, setChatBump] = useState(0);

  const [filter, setFilter] = useState<Filter>('all');
  const [phase, setPhase] = useState<Phase>('searching');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [now, setNow] = useState(Date.now());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [campus, setCampus] = useState<Record<string, string>>({});
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [pip, setPip] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [calling, setCalling] = useState<string | null>(null);
  const [waitingSince, setWaitingSince] = useState(Date.now());
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [openFriendId, setOpenFriendId] = useState<string | null>(null);
  const [demoStream, setDemoStream] = useState<MediaStream | null>(null);
  const [demoSince, setDemoSince] = useState(0);
  const [sameCampus, setSameCampus] = useState(me.meetSameCampus);
  const [safeStart, setSafeStart] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Per person in this call: skipped the safe start, or the browser blocked their sound.
  const [heardEarly, setHeardEarly] = useState<Set<string>>(new Set());
  const [soundBlocked, setSoundBlocked] = useState<Set<string>>(new Set());
  const [soundKick, setSoundKick] = useState(0);

  const phaseRef = useRef<Phase>('searching');
  const sessionRef = useRef<string | null>(null);
  const membersRef = useRef<Member[]>([]);
  const filterRef = useRef<Filter>('all');
  const sameCampusRef = useRef(me.meetSameCampus);
  const gaveUp = useRef<string | null>(null);
  const friendReq = useRef(new Set<string>());
  const demoDispose = useRef<(() => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const booted = useRef(false);
  phaseRef.current = phase;
  filterRef.current = filter;
  sameCampusRef.current = sameCampus;

  // Safe start is a per-device choice, on unless switched off here.
  useEffect(() => {
    try {
      if (localStorage.getItem(SAFE_KEY) === 'off') setSafeStart(false);
    } catch {
      /* storage blocked: keep it on */
    }
  }, []);

  const showToast = useCallback((text: string) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);

  const loadFriends = useCallback(async () => {
    const res = await fetch('/api/friends').catch(() => null);
    if (res?.ok) setFriends(((await res.json()) as { friends: Friend[] }).friends);
  }, []);

  const stopDemo = useCallback(() => {
    demoDispose.current?.();
    demoDispose.current = null;
    setDemoStream(null);
  }, []);

  const clearCall = useCallback(() => {
    sessionRef.current = null;
    membersRef.current = [];
    setSessionId(null);
    setMembers([]);
    setReportOpen(false);
    setInviteOpen(false);
    mesh.sync(null, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesh.sync]);

  const join = useRef<(f: Filter) => Promise<void>>(async () => {});

  const applyState = useCallback(
    (s: MatchState) => {
      setIncoming(s.incoming || []);
      setInvites(s.invites || []);
      if (s.notice === 'no_answer') showToast('No answer. Saved as a missed call.');

      if (s.status === 'matched' && s.session && s.members) {
        const list = s.members;
        if (sessionRef.current !== s.session.id) {
          stopDemo();
          sessionRef.current = s.session.id;
          setSessionId(s.session.id);
          setPhase('connected');
          setCampus({});
          setHeardEarly(new Set());
          setSoundBlocked(new Set());
          setCalling(null);
          friendReq.current = new Set();
          chime();
          loadFriends();
        } else {
          const gone = membersRef.current.filter((m) => !list.some((x) => x.id === m.id));
          gone.forEach((m) => showToast(`${m.handle} left the call`));
          const joined = list.filter((m) => !membersRef.current.some((x) => x.id === m.id));
          if (joined.length) {
            chime();
            joined.forEach((m) => showToast(`${m.handle} joined the call`));
          }
        }
        membersRef.current = list;
        setMembers(list);
        setFriendIds((prev) => {
          const next = new Set(prev);
          list.forEach((m) => m.isFriend && next.add(m.id));
          return next;
        });
        mesh.sync(s.session.id, list.map((m) => m.id));
        return;
      }

      if (sessionRef.current && phaseRef.current === 'connected') {
        // The other person skipped or left: keep rolling, like Next.
        clearCall();
        showToast('They moved on. Finding someone new...');
        loadFriends();
        void join.current(filterRef.current);
        return;
      }
      if (s.status === 'waiting') return setCalling(s.calling);
      setCalling(null);
      if (s.status === 'idle' && phaseRef.current === 'searching') void join.current(filterRef.current);
    },
    [clearCall, loadFriends, mesh, showToast, stopDemo],
  );

  join.current = async (f: Filter) => {
    stopDemo();
    clearCall();
    setPhase('searching');
    setWaitingSince(Date.now());
    const r = await post('/api/match', { action: 'join', filter: f, sameCampus: sameCampusRef.current });
    if (r.ok) applyState(r.data as MatchState);
  };

  // Heartbeat + matchmaking poll.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const res = await fetch('/api/match').catch(() => null);
      if (!alive || !res?.ok) return;
      const s = (await res.json()) as MatchState;
      if (phaseRef.current === 'ended' || phaseRef.current === 'paused' || phaseRef.current === 'demo') {
        setIncoming(s.incoming || []);
        setInvites(s.invites || []);
        if (s.status !== 'matched') return;
      }
      applyState(s);
    };
    // React dev mode mounts twice; joining twice would cancel the first match.
    if (!booted.current) {
      booted.current = true;
      void join.current('all');
    }
    tickRef.current = tick;
    loadFriends();
    // With the WebSocket up, this is just a 10-second heartbeat (keeps you "online").
    let lastTick = 0;
    let lastFriends = 0;
    const t = setInterval(() => {
      if (liveRef.current && Date.now() - lastTick < 10_000) return;
      lastTick = Date.now();
      void tick();
    }, 1500);
    const f = setInterval(() => {
      if (liveRef.current && Date.now() - lastFriends < 30_000) return;
      lastFriends = Date.now();
      void loadFriends();
    }, 5000);
    const leave = () => fetch('/api/match', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'leave' }) });
    window.addEventListener('pagehide', leave);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(f);
      window.removeEventListener('pagehide', leave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  liveHandler.current = (e: LiveEvent) => {
    if (e.type === 'state') tickRef.current();
    else if (e.type === 'signal') mesh.ingest(e.signal);
    else if (e.type === 'friends') loadFriends();
    else if (e.type === 'message') {
      loadFriends();
      setChatBump((n) => n + 1);
    }
  };

  // Clock for timers.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // Video never came through, or dropped and didn't come back: move on instead of a frozen screen.
  useEffect(() => {
    if (phase !== 'connected' || !sessionId || members.length !== 1) return;
    const since = mesh.downSince[members[0].id];
    if (since && now - since > GIVE_UP_MS && gaveUp.current !== sessionId) {
      gaveUp.current = sessionId;
      showToast('Connection was too weak. Finding someone new...');
      void join.current(filterRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const secondsWith = (m: Member) => (m.id === 'demo' ? (now - demoSince) / 1000 : Math.max(0, (now - new Date(m.togetherSince).getTime()) / 1000));

  // After 30 seconds together, ask the server to make you friends (it checks the clock itself).
  useEffect(() => {
    if (phase !== 'connected' || !sessionId) return;
    for (const m of members) {
      if (friendIds.has(m.id) || friendReq.current.has(m.id) || secondsWith(m) < FRIEND_SECS) continue;
      friendReq.current.add(m.id);
      post('/api/session/friend', { sessionId, userId: m.id }).then((r) => {
        if (!r.ok) return void setTimeout(() => friendReq.current.delete(m.id), 2000);
        setFriendIds((s) => new Set(s).add(m.id));
        setNewIds((s) => new Set(s).add(m.id));
        showToast(`You and ${m.handle} are now friends`);
        chime();
        loadFriends();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, phase, sessionId, members]);

  // Mic and camera toggles act on the live tracks, so others see it instantly.
  useEffect(() => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted, localStream]);
  useEffect(() => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !camOff));
  }, [camOff, localStream]);

  const next = useCallback(() => void join.current(filterRef.current), []);

  const stopAndLeave = useCallback(
    async (to: Phase) => {
      stopDemo();
      clearCall();
      setCalling(null);
      setPhase(to);
      await post('/api/match', { action: 'leave' });
    },
    [clearCall, stopDemo],
  );

  const startDemo = useCallback(async () => {
    await post('/api/match', { action: 'leave' });
    const demo = makeDemoStream(DEMO.handle);
    demoDispose.current = demo.dispose;
    setDemoStream(demo.stream);
    setDemoSince(Date.now());
    setMembers([DEMO]);
    setPhase('demo');
    chime();
  }, []);

  // Keyboard: Space / Esc = Next, M = mic, V = camera (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space' || e.key === 'Escape') {
        e.preventDefault();
        if (e.key === 'Escape' && (sheetOpen || reportOpen || inviteOpen || settingsOpen)) {
          setSettingsOpen(false);
          setSheetOpen(false);
          setReportOpen(false);
          setInviteOpen(false);
          return;
        }
        if (phaseRef.current !== 'paused') next();
      } else if (e.key === 'm' || e.key === 'M') setMuted((v) => !v);
      else if (e.key === 'v' || e.key === 'V') setCamOff((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, sheetOpen, reportOpen, inviteOpen, settingsOpen]);

  async function reveal(m: Member) {
    if (m.id === 'demo') return setCampus((c) => ({ ...c, demo: 'IIT Bombay' }));
    if (!sessionId) return;
    const r = await post('/api/session/reveal', { sessionId, userId: m.id });
    if (r.ok) setCampus((c) => ({ ...c, [m.id]: r.data.campus }));
  }

  async function report(m: Member, reason: string) {
    setReportOpen(false);
    if (m.id === 'demo') return next();
    if (!sessionId) return;
    await post('/api/reports', { sessionId, userId: m.id, reason });
    showToast('Report sent. You will not be matched with this person again.');
    loadFriends();
    next();
  }

  async function callFriend(id: string) {
    stopDemo();
    clearCall();
    setPhase('searching');
    setSheetOpen(false);
    setCalling(id);
    setWaitingSince(Date.now());
    const r = await post('/api/match', { action: 'call', userId: id });
    if (!r.ok) showToast(r.data.error || 'Could not call right now.');
  }

  async function invite(id: string) {
    setInviteOpen(false);
    const r = await post('/api/match', { action: 'invite', userId: id });
    const f = friends.find((x) => x.id === id);
    showToast(r.ok ? `Invited ${f?.handle ?? 'your friend'}. Waiting for them to join...` : r.data.error || 'Could not invite.');
  }

  async function answerCall(callerId: string, accept: boolean) {
    setIncoming((x) => x.filter((c) => c.userId !== callerId));
    const r = await post('/api/match', { action: accept ? 'accept' : 'decline', userId: callerId });
    if (accept) {
      if (r.ok) applyState(r.data as MatchState);
      else showToast(r.data.error || 'That call is no longer available.');
    }
  }

  async function answerInvite(inv: Invite, accept: boolean) {
    setInvites((x) => x.filter((i) => i.id !== inv.id));
    const r = await post('/api/match', { action: accept ? 'invite-accept' : 'invite-decline', inviteId: inv.id });
    if (accept) {
      if (r.ok) applyState(r.data as MatchState);
      else showToast(r.data.error || 'That invite expired.');
    }
  }

  const connected = phase === 'connected' || phase === 'demo';
  const isFriend = (m: Member) => friendIds.has(m.id) || m.isFriend;
  // Safe start applies to strangers only; friends are heard and seen straight away.
  const safeLeft = (m: Member, ms: number) => {
    if (!safeStart || phase !== 'connected' || isFriend(m) || heardEarly.has(m.id)) return 0;
    const at = mesh.connectedAt[m.id];
    return at ? Math.max(0, at + ms - now) : ms;
  };
  const hearNow = (id: string) => {
    setHeardEarly((s) => new Set(s).add(id));
    setSoundBlocked((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setSoundKick((k) => k + 1);
  };
  const changeSameCampus = (v: boolean) => {
    setSameCampus(v);
    sameCampusRef.current = v;
    if (phaseRef.current === 'searching' && !calling) void join.current(filterRef.current);
    else void post('/api/match', { action: 'prefs', sameCampus: v });
  };
  const changeFilter = (v: Filter) => {
    setFilter(v);
    filterRef.current = v;
    if (phaseRef.current === 'searching' || phaseRef.current === 'connected') void join.current(v);
  };
  const changeSafeStart = (v: boolean) => {
    setSafeStart(v);
    try {
      localStorage.setItem(SAFE_KEY, v ? 'on' : 'off');
    } catch {
      /* storage blocked: applies to this visit only */
    }
  };
  const group = members.length > 1;
  const callingName = calling ? friends.find((f) => f.id === calling)?.handle || 'your friend' : null;
  const filterLabel = filter === 'all' ? 'any campus' : filter === 'IIT' ? 'an IIT' : 'an IIM';
  const showDemoOffer = phase === 'searching' && !calling && now - waitingSince > 8000;
  const pending = phase === 'connected'
    ? members.filter((m) => !isFriend(m)).map((m) => ({ handle: m.handle, avatarUrl: m.avatarUrl, secondsLeft: Math.max(0, Math.ceil(FRIEND_SECS - secondsWith(m))), pct: Math.min(100, Math.round((secondsWith(m) / FRIEND_SECS) * 100)) }))
    : [];
  const onlineCount = friends.filter((f) => f.online).length;
  // "+ person" turns on once you're friends with the person you're talking to.
  const canAdd = phase === 'connected' && members.length === 1 && isFriend(members[0]);
  const invitable = friends.filter((f) => f.online && !f.inCall && !f.busy && !members.some((m) => m.id === f.id));
  const stageCls = group ? 'rl-group' : pip ? 'rl-pip' : 'rl-split';
  const tiles: (Member | null)[] = connected ? members : [null];

  const ctl = (danger: boolean) =>
    `rl-ctl flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full border ${danger ? 'border-orange-900 bg-[#2A1A11] text-orange-300' : 'border-neutral-800 bg-neutral-800 text-paper hover:bg-neutral-700'} disabled:opacity-40`;

  return (
    <div className="flex min-h-screen flex-col bg-obsidian text-paper">
      <header className="rl-hdr border-b border-neutral-800">
        <div className="rl-top flex flex-wrap items-center justify-between gap-2.5 px-6 py-3">
          <a href="/" aria-label="Padhaku Log home" className="flex items-center">
            <LogoImage dark height={34} />
          </a>
          <div className="flex flex-wrap items-center gap-2">
            {!mesh.relayOnly && (
              <span title="Add Cloudflare TURN keys in .env before real users: right now calls connect directly and expose IP addresses." className="rl-hide-sm inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-900 bg-amber-950 px-3 text-xs font-semibold text-amber-300">
                Dev: direct video
              </span>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-expanded={settingsOpen}
                aria-label="Match settings"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900/85 px-3.5 text-[13px] font-semibold text-paper"
              >
                <SlidersHorizontal size={14} aria-hidden /> <span className="rl-hide-sm">Settings</span>
              </button>
              {settingsOpen && (
                <div className="absolute left-0 top-12 z-[9] w-[min(290px,calc(100vw-32px))] rounded-[20px] border border-neutral-700 bg-neutral-900 p-2 shadow-2xl max-[600px]:left-auto max-[600px]:right-0">
                  {/* On phones the campus filter lives here instead of the header. */}
                  <div className="rl-only-sm flex-col gap-2 px-2.5 pb-2 pt-2.5">
                    <span className="text-[13px] font-semibold">Match with</span>
                    <div role="group" aria-label="Match with" className="flex gap-1 rounded-full bg-neutral-800 p-1">
                      {(['all', 'IIT', 'IIM'] as Filter[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          aria-pressed={filter === f}
                          onClick={() => changeFilter(f)}
                          className={`h-8 flex-1 rounded-full text-xs font-bold ${filter === f ? 'bg-marker text-ink' : 'text-neutral-300'}`}
                        >
                          {f === 'all' ? 'Everyone' : `${f}s only`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Switch
                    on={sameCampus}
                    onChange={changeSameCampus}
                    label="Meet people from my campus"
                    hint="Off: nobody from your own college shows up. On: they can, but only if they have it on too."
                  />
                  <Switch
                    on={safeStart}
                    onChange={changeSafeStart}
                    label="Safe start"
                    hint="New strangers start blurred for 3 seconds, and you hear them after 5. Tap to skip anytime."
                  />
                </div>
              )}
            </div>
            <label htmlFor="rl-filter" className="sr-only rl-hide-sm">Match with</label>
            <select
              id="rl-filter"
              value={filter}
              onChange={(e) => changeFilter(e.target.value as Filter)}
              className="rl-field rl-hide-sm h-10 rounded-full border border-neutral-700 bg-neutral-900/85 px-3.5 text-[13px] font-semibold text-paper"
            >
              <option value="all">All Campuses</option>
              <option value="IIT">IITs Only</option>
              <option value="IIM">IIMs Only</option>
            </select>
            <button
              type="button"
              onClick={() => showToast('Gender filter is coming soon with Padhaku Pro.')}
              className="rl-hide-sm inline-flex h-10 items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900/85 px-3.5 text-[13px] font-semibold text-neutral-300"
            >
              <Lock size={13} aria-hidden /> Gender <span className="rounded bg-marker px-1 text-[10px] font-bold text-ink">PRO</span>
            </button>
            <a href="/onboarding" aria-label="Edit your profile" title={`${me.handle} · edit profile`} className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-marker hover:ring-paper">
              <Avatar url={me.avatarUrl} name={me.handle} size={32} />
            </a>
          </div>
        </div>
      </header>

      <main className={`rl-shell ${sheetOpen ? 'rl-sheet-open' : ''}`}>
        <section className="rl-stagecol">
          <div className={`rl-stage ${stageCls}`}>
            {tiles.map((m, i) => (
              <div key={m?.id ?? 'empty'} className={`rl-tile rl-remote ${i === 1 ? 'rl-remote-b' : 'rl-remote-a'}`} style={{ background: m ? '#23252B' : '#17181C' }}>
                {m && (
                  <>
                    <Silhouette />
                    <VideoEl
                      stream={m.id === 'demo' ? demoStream : mesh.streams[m.id]}
                      blur={safeLeft(m, BLUR_MS) > 0}
                      muted={safeLeft(m, SOUND_MS) > 0 || soundBlocked.has(m.id)}
                      kick={soundKick}
                      onSoundBlocked={() => setSoundBlocked((s) => new Set(s).add(m.id))}
                    />
                    {phase === 'connected' && mesh.states[m.id] === 'connected' && (safeLeft(m, SOUND_MS) > 0 || soundBlocked.has(m.id)) && (
                      <button
                        type="button"
                        onClick={() => hearNow(m.id)}
                        className="absolute left-1/2 top-1/2 z-[3] inline-flex h-10 -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-paper px-4 text-[13px] font-bold text-ink shadow-[3px_3px_0_#FCE07A]"
                      >
                        {soundBlocked.has(m.id) && !safeLeft(m, SOUND_MS) ? (
                          <><Volume2 size={16} aria-hidden /> Tap to hear them</>
                        ) : (
                          <><VolumeX size={16} aria-hidden /> {safeLeft(m, BLUR_MS) > 0 ? 'Video' : 'Sound'} in {Math.ceil(safeLeft(m, safeLeft(m, BLUR_MS) > 0 ? BLUR_MS : SOUND_MS) / 1000)}s · Start now</>
                        )}
                      </button>
                    )}
                    {phase === 'connected' && mesh.states[m.id] !== 'connected' && (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-neutral-300">Connecting video...</span>
                    )}
                    <div className="rl-ovl-top absolute left-3.5 right-3.5 top-3.5 flex flex-wrap items-start justify-between gap-2">
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-obsidian/60 px-2.5 text-xs font-semibold">
                        <span className="h-[7px] w-[7px] animate-rl-blink rounded-full bg-red-500" /> {phase === 'demo' ? 'Demo' : 'Live'}
                      </span>
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {phase === 'connected' && !isFriend(m) && (
                          <span title="Stay 30 seconds to become friends" className="inline-flex h-8 items-center gap-2 rounded-full border border-white/15 bg-obsidian/60 px-3 text-xs font-semibold">
                            <UserPlus size={14} className="text-marker" aria-hidden /> Friends in {Math.max(0, Math.ceil(FRIEND_SECS - secondsWith(m)))}s
                          </span>
                        )}
                        {phase === 'connected' && isFriend(m) && (
                          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-marker px-3 text-xs font-bold text-ink">
                            <UserCheck size={14} aria-hidden /> Friends
                          </span>
                        )}
                        {campus[m.id] ? (
                          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-paper px-3 text-xs font-bold text-ink">
                            <GraduationCap size={14} aria-hidden /> {campus[m.id]}
                          </span>
                        ) : (
                          <button type="button" onClick={() => reveal(m)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-obsidian/60 px-3 text-xs font-semibold">
                            <Eye size={14} aria-hidden /> Reveal Campus
                          </button>
                        )}
                      </span>
                    </div>
                    {/* The bio card: no names, just an anonymous ID and one line. */}
                    <div className="rl-namecard absolute bottom-3.5 left-3.5 flex max-w-[min(420px,calc(100%-28px))] items-center gap-3 rounded-[20px] bg-paper px-4 py-3 text-ink shadow-[4px_4px_0_#FCE07A]">
                      <Avatar url={m.avatarUrl} name={m.handle} size={40} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[15px] font-bold">{m.handle}</span>
                        <span className="text-xs text-neutral-600">{[m.institutionType, ...m.languages].join(' · ')}</span>
                        {m.bio && <span className="line-clamp-2 font-hand text-base leading-snug">&ldquo;{m.bio}&rdquo;</span>}
                      </span>
                    </div>
                  </>
                )}

                {!m && phase === 'searching' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
                    <span className="relative flex h-[72px] w-[72px] items-center justify-center">
                      <span className="absolute inset-0 animate-rl-pulse rounded-full border-2 border-marker" />
                      <LogoMark size={56} />
                    </span>
                    <span className="flex flex-col gap-1.5">
                      <span className="font-display text-[26px] font-extrabold tracking-tight">Chalo, baat karein...</span>
                      <span className="text-sm text-neutral-400">{callingName ? `Calling ${callingName}...` : `Finding a verified student from ${filterLabel}`}</span>
                    </span>
                    {showDemoOffer && (
                      <span className="flex max-w-xs flex-col items-center gap-2.5">
                        <span className="text-[13px] leading-normal text-neutral-500">Nobody else is online right now. Open the site in a second browser with another campus email, or try a demo.</span>
                        <button type="button" onClick={startDemo} className="h-11 rounded-full border border-neutral-600 px-5 text-[13px] font-bold hover:bg-neutral-800">Try a demo match</button>
                      </span>
                    )}
                  </div>
                )}

                {!m && (phase === 'ended' || phase === 'paused') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-[18px] p-6 text-center">
                    <span className="font-display text-[26px] font-extrabold tracking-tight">{phase === 'paused' ? 'Paused' : 'Call ended'}</span>
                    <span className="max-w-xs text-sm leading-normal text-neutral-400">
                      {phase === 'paused' ? 'Nobody can match with you right now. Friends can still call you.' : 'Take a breather. Your friends are still on the list whenever you want to talk again.'}
                    </span>
                    <span className="flex flex-wrap justify-center gap-2.5">
                      <button type="button" onClick={next} className="h-12 rounded-full bg-marker px-6 text-[15px] font-bold text-ink hover:bg-[#F5D45C]">{phase === 'paused' ? 'Resume' : 'Chalo, Milte Hain'}</button>
                      <a href="/" className="inline-flex h-12 items-center rounded-full border-2 border-paper px-6 text-[15px] font-bold">Leave</a>
                    </span>
                  </div>
                )}

                {i === 0 && (incoming.length > 0 || invites.length > 0) && (
                  <div className="rl-ovl-top absolute left-1/2 top-16 z-[4] flex w-[calc(100%-32px)] max-w-sm -translate-x-1/2 flex-col gap-2">
                    {incoming.slice(0, 1).map((c) => (
                      <div key={c.userId} className="flex items-center justify-between gap-3 rounded-[20px] border border-neutral-700 bg-neutral-900/95 p-3 shadow-2xl">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar url={c.avatarUrl} name={c.handle} size={32} />
                          <span className="truncate text-sm font-semibold">{c.handle} is calling</span>
                        </span>
                        <span className="flex gap-2">
                          <button type="button" onClick={() => answerCall(c.userId, false)} className="h-10 rounded-full border border-neutral-600 px-4 text-xs font-bold">Decline</button>
                          <button type="button" onClick={() => answerCall(c.userId, true)} className="h-10 rounded-full bg-marker px-4 text-xs font-bold text-ink">Accept</button>
                        </span>
                      </div>
                    ))}
                    {invites.slice(0, 1).map((inv) => (
                      <div key={inv.id} className="flex flex-col gap-2.5 rounded-[20px] border border-neutral-700 bg-neutral-900/95 p-3 shadow-2xl">
                        <span className="text-sm font-semibold">{inv.fromHandle} invited you to a call{inv.others.length ? ` with ${inv.others.join(', ')}` : ''}</span>
                        <span className="flex justify-end gap-2">
                          <button type="button" onClick={() => answerInvite(inv, false)} className="h-10 rounded-full border border-neutral-600 px-4 text-xs font-bold">Decline</button>
                          <button type="button" onClick={() => answerInvite(inv, true)} className="h-10 rounded-full bg-marker px-4 text-xs font-bold text-ink">Join</button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {i === 0 && toast && (
                  <div role="status" className="rl-ovl-top absolute left-1/2 top-[60px] z-[5] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-full bg-paper px-4 py-2.5 text-[13px] font-semibold text-ink shadow-[4px_4px_0_#FCE07A]">
                    <Check size={16} strokeWidth={2.5} className="flex-none" aria-hidden /> {toast}
                  </div>
                )}
              </div>
            ))}

            {/* You */}
            <div className="rl-tile rl-local">
              {localStream && !camOff ? (
                <VideoEl stream={localStream} muted />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-900 p-3 text-center text-neutral-500">
                  <VideoOff size={24} aria-hidden />
                  <span className="rl-hide-sm text-xs text-neutral-400">{mediaError || (camOff ? 'Camera off' : 'Starting camera...')}</span>
                </div>
              )}
              <span className="absolute bottom-2 left-2 inline-flex h-6 items-center gap-1.5 rounded-full border border-white/10 bg-obsidian/60 px-2.5 text-[11px] font-semibold">
                You {muted && <MicOff size={12} className="text-orange-300" aria-label="Muted" />}
              </span>
            </div>
          </div>

          <div className="rl-dockwrap">
            <div className="rl-dock">
              <button type="button" onClick={() => setMuted((v) => !v)} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} aria-pressed={muted} className={ctl(muted)}>
                {muted ? <MicOff size={20} aria-hidden /> : <Mic size={20} aria-hidden />}
                <span className="rl-hide-md font-mono text-[10px] text-neutral-500">M</span>
              </button>
              <button type="button" onClick={() => setCamOff((v) => !v)} aria-label={camOff ? 'Turn camera on' : 'Turn camera off'} aria-pressed={camOff} className={ctl(camOff)}>
                {camOff ? <VideoOff size={20} aria-hidden /> : <Video size={20} aria-hidden />}
                <span className="rl-hide-md font-mono text-[10px] text-neutral-500">V</span>
              </button>
              {!group && (
                <button type="button" onClick={() => setPip((v) => !v)} aria-label="Toggle picture in picture" aria-pressed={pip} className={`${ctl(false)} rl-hide-md`}>
                  <PictureInPicture2 size={20} aria-hidden />
                  <span className="text-[10px] text-neutral-500">{pip ? 'Split' : 'PiP'}</span>
                </button>
              )}
              <button type="button" onClick={() => setSheetOpen(true)} aria-label="Friends and chat" className={`${ctl(false)} rl-only-md relative !text-marker`}>
                <Users size={20} aria-hidden />
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-marker px-1 text-[11px] font-bold text-ink">{onlineCount}</span>
              </button>

              <button type="button" onClick={next} className="rl-next flex h-14 items-center justify-center gap-3 rounded-full bg-marker px-7 text-lg font-bold tracking-tight text-ink hover:bg-[#F5D45C]">
                {phase === 'paused' ? 'Resume' : 'Next'} <SkipForward size={20} fill="currentColor" aria-hidden />
                <span className="rl-hide-md rounded-md border border-ink/20 bg-ink/10 px-[7px] py-[3px] font-mono text-[11px] font-semibold text-ink">Space</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setInviteOpen((v) => !v)}
                  disabled={!canAdd}
                  aria-label="Add a friend to this call"
                  title={canAdd ? 'Add a friend to this call' : 'Becomes active once you are friends with the person you are talking to'}
                  aria-expanded={inviteOpen}
                  className={`${ctl(false)} ${canAdd ? '!border-marker !text-marker' : ''}`}
                >
                  <UserPlus size={20} aria-hidden />
                </button>
                {inviteOpen && (
                  <div role="menu" className="absolute bottom-[68px] left-1/2 z-[8] w-[260px] -translate-x-1/2 rounded-[20px] border border-neutral-700 bg-neutral-900 p-2 shadow-2xl">
                    <div className="flex flex-col gap-1 px-2.5 pb-2.5 pt-2">
                      <span className="text-sm font-semibold">Add a friend to this call</span>
                      <span className="text-xs leading-snug text-neutral-400">Three of you can talk together.</span>
                    </div>
                    {invitable.length === 0 && <p className="px-2.5 pb-2 text-xs text-neutral-500">No other friends are free right now.</p>}
                    {invitable.map((f) => (
                      <button key={f.id} type="button" role="menuitem" onClick={() => invite(f.id)} className="flex h-11 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] font-medium hover:bg-neutral-800">
                        <Avatar url={f.avatarUrl} name={f.handle} size={28} /> {f.handle}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => (phase === 'paused' ? next() : stopAndLeave('paused'))}
                aria-label={phase === 'paused' ? 'Resume matching' : 'Pause matching'}
                aria-pressed={phase === 'paused'}
                className={ctl(false)}
              >
                {phase === 'paused' ? <Play size={20} aria-hidden /> : <Pause size={20} aria-hidden />}
              </button>

              <div className="relative">
                <button type="button" onClick={() => setReportOpen((v) => !v)} disabled={!connected} aria-label="Report" aria-expanded={reportOpen} className="rl-ctl flex h-14 w-14 items-center justify-center rounded-full border border-neutral-800 bg-neutral-800 text-orange-300 hover:bg-neutral-700 disabled:opacity-40">
                  <Flag size={20} aria-hidden />
                </button>
                {reportOpen && (
                  <div role="menu" className="absolute bottom-[68px] right-[-90px] z-[8] max-h-[60vh] w-[270px] overflow-y-auto rounded-[20px] border border-neutral-700 bg-neutral-900 p-2 shadow-2xl">
                    <div className="flex flex-col gap-1 px-2.5 pb-2.5 pt-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck size={15} aria-hidden /> Report</span>
                      <span className="text-xs leading-snug text-neutral-400">You leave the call at once and a moderator reviews it.</span>
                    </div>
                    {members.map((m) => (
                      <div key={m.id} className="flex flex-col">
                        {group && <span className="px-2.5 pb-1 pt-2 text-[11px] font-semibold tracking-wide text-neutral-500">{m.handle.toUpperCase()}</span>}
                        {REPORT_REASONS.map((r) => (
                          <button key={r} type="button" role="menuitem" onClick={() => report(m, r)} className="h-10 w-full rounded-[10px] px-2.5 text-left text-[13px] font-medium hover:bg-neutral-800">
                            {r}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => stopAndLeave('ended')} aria-label="End call" className="rl-ctl flex h-14 w-14 items-center justify-center rounded-full border-2 border-paper bg-transparent text-paper hover:bg-paper hover:text-ink">
                <PhoneOff size={20} aria-hidden />
              </button>
            </div>
            <span className="rl-hide-md text-xs text-neutral-500">Space or Esc: Next  ·  M: Mic  ·  V: Camera</span>
          </div>
        </section>

        <button type="button" className="rl-backdrop" onClick={() => setSheetOpen(false)} aria-label="Close friends" />

        <aside className="rl-panel" aria-label="Friends and chat">
          <FriendsPanel
            friends={friends}
            openFriendId={openFriendId}
            onOpen={setOpenFriendId}
            onBack={() => setOpenFriendId(null)}
            onCall={callFriend}
            onClose={() => setSheetOpen(false)}
            pending={pending}
            newIds={newIds}
            chatBump={chatBump}
            live={live.connected}
          />
        </aside>
      </main>
    </div>
  );
}
