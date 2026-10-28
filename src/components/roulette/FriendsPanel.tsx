'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, PhoneIncoming, PhoneMissed, Send, ShieldAlert, Video, X } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { looksLikeContact } from '@/lib/contact';

interface LastMessage { kind: string; text: string; seconds: number | null; mine: boolean; at: string }

export interface Friend {
  id: string;
  handle: string;
  avatarUrl: string | null;
  campus: string;
  online: boolean;
  lastSeen: string;
  inCall: boolean;
  busy: boolean;
  lastMessage: LastMessage | null;
}

interface ChatMessage { id: number; kind: string; text: string; seconds: number | null; flagged: boolean; mine: boolean; at: string }

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `Last seen ${Math.max(1, m)}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `Last seen ${h}h ago` : `Last seen ${Math.round(h / 24)}d ago`;
}

const duration = (s: number | null) => {
  const sec = s ?? 0;
  if (sec < 60) return `${sec} sec`;
  const m = Math.round(sec / 60);
  return `${m} min`;
};

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function preview(m: LastMessage) {
  if (m.kind === 'call') return `Call · ${duration(m.seconds)}`;
  if (m.kind === 'missed_call') return m.mine ? 'Missed call (you called)' : 'Missed call';
  return `${m.mine ? 'You: ' : ''}${m.text}`;
}

const PROMPTS = ['Kya chal raha hai?', 'Call again later?', 'Exams kab hain?', 'Fest pe milte hain'];

function OnlineDot({ online }: { online: boolean }) {
  return <span className={`absolute -bottom-px -right-px h-3 w-3 rounded-full border-2 border-ink ${online ? 'bg-marker' : 'bg-neutral-600'}`} />;
}

export function FriendsPanel(props: {
  friends: Friend[];
  openFriendId: string | null;
  onOpen: (id: string) => void;
  onBack: () => void;
  onCall: (id: string) => void;
  onClose: () => void;
  pending: { handle: string; avatarUrl: string | null; secondsLeft: number; pct: number }[];
  newIds: Set<string>;
  chatBump: number;
  live: boolean;
}) {
  const { friends, openFriendId, pending } = props;
  // Whoever you're on a call with comes first, then online friends, then offline.
  const rank = (f: Friend) => (f.inCall ? 0 : f.online ? 1 : 2);
  const sorted = friends.map((f, i) => ({ f, i })).sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i).map((x) => x.f);
  const open = openFriendId ? friends.find((f) => f.id === openFriendId) : null;
  const onlineCount = friends.filter((f) => f.online).length;

  if (open) return <ChatThread friend={open} onBack={props.onBack} onCall={props.onCall} onClose={props.onClose} bump={props.chatBump} live={props.live} />;

  return (
    <>
      <div className="flex flex-col gap-1 border-b border-neutral-800/70 px-[18px] pb-3.5 pt-4">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="font-display text-xl font-extrabold">Dost</span>
            <span className="text-xs font-semibold text-neutral-300">{onlineCount} online</span>
          </span>
          <button type="button" onClick={props.onClose} aria-label="Close" className="rl-only-md h-[34px] w-[34px] items-center justify-center rounded-full border border-neutral-700 bg-neutral-800">
            <X size={16} aria-hidden />
          </button>
        </span>
        <span className="text-xs leading-snug text-neutral-400">Talk 30 seconds without skipping and you get added here. Tap a friend to chat.</span>
      </div>

      {pending.map((p) => (
        <div key={p.handle} className="mx-2.5 mt-2.5 flex items-center gap-2.5 rounded-2xl border border-marker/30 bg-marker/[0.08] p-3">
          <Avatar url={p.avatarUrl} name={p.handle} size={38} />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="truncate text-[13px] font-semibold">Talking to {p.handle}</span>
            <span className="h-[5px] overflow-hidden rounded-full bg-neutral-800">
              <span className="block h-full rounded-full bg-marker transition-[width] duration-1000 ease-linear" style={{ width: `${p.pct}%` }} />
            </span>
            <span className="text-[11px] text-neutral-300">Friends in {p.secondsLeft}s if nobody skips</span>
          </span>
        </div>
      ))}

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {sorted.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] leading-relaxed text-neutral-400">No friends yet. Stay on a call for 30 seconds and you&apos;ll both show up here.</p>
        )}
        {sorted.map((f) => (
          <div key={f.id} className={`flex items-center gap-2 rounded-[14px] px-2.5 py-[9px] hover:bg-neutral-800 ${f.inCall ? 'bg-neutral-800 ring-1 ring-inset ring-neutral-700' : ''} ${f.online || f.inCall ? '' : 'opacity-70'}`}>
            <button type="button" onClick={() => props.onOpen(f.id)} aria-label={`Chat with ${f.handle}`} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
              <span className="relative flex-none">
                <Avatar url={f.avatarUrl} name={f.handle} size={40} />
                <OnlineDot online={f.online} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{f.handle}</span>
                  {f.inCall && <span className="flex-none rounded-full bg-paper px-1.5 text-[10px] font-bold text-ink">IN CALL</span>}
                  {props.newIds.has(f.id) && <span className="flex-none rounded-full bg-marker px-1.5 text-[10px] font-bold text-ink">NEW</span>}
                </span>
                <span className="truncate text-xs text-neutral-400">
                  {f.inCall ? 'In call with you' : f.lastMessage ? preview(f.lastMessage) : f.online ? (f.busy ? 'In another call' : 'Online') : ago(f.lastSeen)}
                </span>
              </span>
            </button>
            {f.lastMessage && !f.inCall && <span className="flex-none text-[11px] text-neutral-500">{time(f.lastMessage.at)}</span>}
            <button
              type="button"
              onClick={() => props.onCall(f.id)}
              disabled={!f.online || f.inCall || f.busy}
              aria-label={`Video call ${f.handle}`}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 hover:bg-neutral-800 disabled:opacity-40"
            >
              <Video size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function ChatThread({ friend, onBack, onCall, onClose, bump, live }: { friend: Friend; onBack: () => void; onCall: (id: string) => void; onClose: () => void; bump: number; live: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const cursor = useRef(0);
  const loadRef = useRef<() => Promise<void>>(async () => {});
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    cursor.current = 0;
    setMessages([]);
    const load = async () => {
      const res = await fetch(`/api/messages?with=${friend.id}&after=${cursor.current}`).catch(() => null);
      if (!alive || !res?.ok) return;
      const { messages: fresh } = (await res.json()) as { messages: ChatMessage[] };
      if (!fresh.length) return;
      cursor.current = fresh[fresh.length - 1].id;
      setMessages((m) => [...m, ...fresh.filter((x) => !m.some((y) => y.id === x.id))]);
    };
    load();
    loadRef.current = load;
    // New messages are pushed live; this poll is the fallback when offline.
    const t = setInterval(load, live ? 30_000 : 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [friend.id, live]);

  useEffect(() => {
    if (bump) void loadRef.current();
  }, [bump]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send(text: string) {
    const body = text.trim();
    if (!body) return;
    setDraft('');
    setError('');
    const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: friend.id, text: body }) });
    const data = await (res.json() as Promise<Record<string, any>>).catch(() => ({}) as Record<string, any>);
    if (!res.ok) return setError(data.error || 'Could not send.');
    const message = data.message as ChatMessage;
    cursor.current = Math.max(cursor.current, message.id);
    setMessages((m) => (m.some((x) => x.id === message.id) ? m : [...m, message]));
  }

  const draftRisky = looksLikeContact(draft);

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-neutral-800/70 px-3.5 py-3">
        <button type="button" onClick={onBack} aria-label="Back to friends" className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-neutral-700 bg-neutral-800">
          <ChevronLeft size={16} aria-hidden />
        </button>
        <span className="relative flex-none">
          <Avatar url={friend.avatarUrl} name={friend.handle} size={36} />
          <OnlineDot online={friend.online} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{friend.handle}</span>
          <span className={`truncate text-xs ${friend.online ? 'text-marker' : 'text-neutral-400'}`}>
            {friend.inCall ? 'In call with you' : friend.online ? `Online · ${friend.campus}` : ago(friend.lastSeen)}
          </span>
        </span>
        {friend.online && !friend.inCall && !friend.busy && (
          <button type="button" onClick={() => onCall(friend.id)} className="inline-flex h-[34px] flex-none items-center gap-1.5 rounded-full bg-marker px-3.5 text-xs font-bold text-ink">
            <Video size={14} aria-hidden /> Call
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Close" className="rl-only-md h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-neutral-700 bg-neutral-800">
          <X size={16} aria-hidden />
        </button>
      </div>
      <div ref={listRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
        <div className="self-center rounded-full border border-marker/30 bg-marker/[0.08] px-3 py-1.5 text-center font-hand text-sm text-marker">You became friends after a 30 second call.</div>
        {messages.map((m) =>
          m.kind === 'text' ? (
            <div key={m.id} className={`flex max-w-[82%] flex-col gap-1 ${m.mine ? 'self-end items-end' : 'self-start items-start'}`}>
              <div className={`px-[13px] py-[9px] text-sm leading-snug ${m.mine ? 'rounded-[18px_18px_6px_18px] bg-marker text-ink' : 'rounded-[18px_18px_18px_6px] bg-neutral-800 text-paper'}`}>
                {m.text}
                <span className={`ml-2 text-[10px] ${m.mine ? 'text-ink/60' : 'text-neutral-400'}`}>{time(m.at)}</span>
              </div>
              {m.flagged && (
                <span className="inline-flex items-center gap-1 text-[11px] text-marker">
                  <ShieldAlert size={12} aria-hidden /> Careful: sharing contact details can lead to scams or blackmail.
                </span>
              )}
            </div>
          ) : (
            <div key={m.id} className={`flex items-center gap-2.5 rounded-2xl border border-neutral-700 bg-neutral-800 px-3 py-2 ${m.mine ? 'self-end' : 'self-start'}`}>
              {m.kind === 'call' ? <PhoneIncoming size={16} className="text-marker" aria-hidden /> : <PhoneMissed size={16} className="text-orange-300" aria-hidden />}
              <span className="flex flex-col">
                <span className="text-[13px] font-semibold">{m.kind === 'call' ? 'Call' : 'Missed call'}</span>
                <span className="text-[11px] text-neutral-500">{time(m.at)}{m.kind === 'call' ? ` · ${duration(m.seconds)}` : ''}</span>
              </span>
            </div>
          ),
        )}
      </div>
      <div className="flex flex-col gap-2.5 border-t border-neutral-800/70 px-3.5 pb-3.5 pt-3">
        {draftRisky && (
          <span className="inline-flex items-start gap-1.5 rounded-xl border border-marker/30 bg-marker/10 px-3 py-2 text-xs leading-snug text-marker">
            <ShieldAlert size={14} className="mt-px flex-none" aria-hidden /> This looks like a contact detail. Share it only if you trust them: it can lead to scams or blackmail.
          </span>
        )}
        <div className="flex flex-wrap gap-1.5">
          {PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => send(p)} className="h-[30px] rounded-full border border-neutral-700 px-3 text-xs font-medium text-neutral-300 hover:border-marker hover:text-paper">
              {p}
            </button>
          ))}
        </div>
        {error && <span className="text-xs text-orange-300">{error}</span>}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="rl-msg" className="sr-only">Message</label>
          <input
            id="rl-msg"
            autoComplete="off"
            maxLength={1000}
            placeholder={`Message ${friend.handle}...`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="rl-field h-12 min-w-0 flex-1 rounded-full border border-neutral-700 bg-obsidian px-4 text-sm text-paper"
          />
          <button type="submit" aria-label="Send message" className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-marker text-ink">
            <Send size={18} aria-hidden />
          </button>
        </form>
      </div>
    </>
  );
}
