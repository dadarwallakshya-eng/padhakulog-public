import { db, FRIEND_AFTER_MS, onlineSince, ONLINE_WINDOW_MS } from './db';
import { pairKey } from './http';
import { notify } from './live';
import type { CurrentUser } from './session';

export type Filter = 'all' | 'IIT' | 'IIM';
export const asFilter = (v: unknown): Filter => (v === 'IIT' || v === 'IIM' ? v : 'all');

export const RING_MS = 30_000; // a friend call or an invite rings this long
export const MAX_MEMBERS = 3;

export function safeList(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export const avatarUrl = (key: string | null | undefined) => (key ? `/api/avatar/${key}` : null);

export async function areFriends(a: string, b: string) {
  return !!(await db.friendship.findUnique({ where: { userAId_userBId: pairKey(a, b) } }));
}

async function activeMembership(userId: string) {
  return db.sessionMember.findFirst({
    where: { userId, leftAt: null, session: { endedAt: null } },
    include: { session: { include: { members: { where: { leftAt: null } } } } },
  });
}

// Leave the current call. Records "Call, N minutes" in each friend's chat,
// and ends the call when fewer than two people are left.
export async function leaveSession(userId: string, reason: string) {
  const m = await activeMembership(userId);
  if (!m) return;
  const now = new Date();
  await db.sessionMember.update({ where: { id: m.id }, data: { leftAt: now, leftReason: reason } });
  const others = m.session.members.filter((o) => o.userId !== userId);
  for (const o of others) {
    if (await areFriends(userId, o.userId)) {
      const from = Math.max(m.joinedAt.getTime(), o.joinedAt.getTime());
      await db.message.create({ data: { fromId: userId, toId: o.userId, kind: 'call', seconds: Math.max(1, Math.round((now.getTime() - from) / 1000)) } });
    }
  }
  if (others.length < 2) await db.session.update({ where: { id: m.sessionId }, data: { endedAt: now, endReason: reason } });
  await notify(others.map((o) => o.userId), { type: 'state' });
}

async function cancelOutgoingCall(userId: string) {
  const row = await db.matchQueue.findUnique({ where: { userId } });
  if (row?.status === 'WAITING' && row.targetUserId) {
    await db.message.create({ data: { fromId: userId, toId: row.targetUserId, kind: 'missed_call' } });
    await notify([row.targetUserId], { type: 'state' });
    await notify([row.targetUserId], { type: 'message', from: userId });
  }
}

async function blockedIds(userId: string): Promise<Set<string>> {
  const rows = await db.blockedUser.findMany({ where: { OR: [{ userId }, { blockedUserId: userId }] } });
  return new Set(rows.map((r) => (r.userId === userId ? r.blockedUserId : r.userId)));
}

// D1 has no multi-statement transactions, so each person's queue row is
// claimed with its own conditional update (each one is atomic). If the second
// claim loses a race, the first is released again.
async function claim(userId: string, where: Record<string, unknown> = {}) {
  const r = await db.matchQueue.updateMany({ where: { userId, status: 'WAITING', ...where }, data: { status: 'MATCHED' } });
  return r.count === 1;
}

async function startSession(a: string, b: string): Promise<string> {
  const s = await db.session.create({ data: { members: { create: [{ userId: a }, { userId: b }] } } });
  await db.matchQueue.deleteMany({ where: { userId: { in: [a, b] } } });
  await notify([a, b], { type: 'state' });
  return s.id;
}

async function pair(a: string, b: string): Promise<string | null> {
  if (!(await claim(b))) return null;
  if (!(await claim(a))) {
    await db.matchQueue.updateMany({ where: { userId: b, status: 'MATCHED' }, data: { status: 'WAITING' } });
    return null;
  }
  return startSession(a, b);
}

export async function joinQueue(user: CurrentUser, filter: Filter, targetUserId: string | null, meetSameCampus?: boolean) {
  await cancelOutgoingCall(user.id);
  if (meetSameCampus !== undefined && meetSameCampus !== user.meetSameCampus) {
    await db.user.update({ where: { id: user.id }, data: { meetSameCampus } });
  }
  await leaveSession(user.id, 'NEXT');
  await db.matchQueue.upsert({
    where: { userId: user.id },
    update: { status: 'WAITING', filter, targetUserId, joinedAt: new Date(), institutionType: user.institution.institutionType },
    create: { userId: user.id, filter, targetUserId, institutionType: user.institution.institutionType },
  });
  if (targetUserId) await notify([targetUserId], { type: 'state' }); // ring the friend
  else await tryRandomMatch(user.id);
}

export async function leaveQueue(userId: string, reason: string) {
  await cancelOutgoingCall(userId);
  await leaveSession(userId, reason);
  await db.matchQueue.deleteMany({ where: { userId } });
}

// Don't put the same two people together again too soon. The wait gets
// shorter the longer you've been searching, so a quiet hour still finds you
// someone instead of an empty screen.
const REMATCH_STEPS: { waitedMs: number; cooldownMs: number }[] = [
  { waitedMs: 0, cooldownMs: 2 * 3600_000 },
  { waitedMs: 10_000, cooldownMs: 30 * 60_000 },
  { waitedMs: 30_000, cooldownMs: 0 },
];
// Matching only picks people whose page checked in very recently, so nobody
// lands on someone who just closed the tab.
const MATCH_FRESH_MS = 20_000;

async function recentPartners(userId: string, since: Date): Promise<Set<string>> {
  const mine = await db.sessionMember.findMany({ where: { userId, joinedAt: { gte: since } }, select: { sessionId: true } });
  if (!mine.length) return new Set();
  const others = await db.sessionMember.findMany({ where: { sessionId: { in: mine.map((m) => m.sessionId) }, userId: { not: userId } }, select: { userId: true } });
  return new Set(others.map((o) => o.userId));
}

async function tryRandomMatch(userId: string) {
  const me = await db.matchQueue.findUnique({ where: { userId } });
  if (!me || me.status !== 'WAITING' || me.targetUserId) return;

  const candidates = await db.matchQueue.findMany({ where: { status: 'WAITING', targetUserId: null, userId: { not: userId } }, orderBy: { joinedAt: 'asc' }, take: 50 });
  if (!candidates.length) return;
  const [meUser, people, blocked] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { institutionId: true, meetSameCampus: true } }),
    db.user.findMany({
      where: { id: { in: candidates.map((c) => c.userId) }, isBanned: false, lastSeen: { gte: new Date(Date.now() - MATCH_FRESH_MS) } },
      select: { id: true, institutionId: true, meetSameCampus: true },
    }),
    // Blocking and reporting (a report also blocks) work both ways, forever.
    blockedIds(userId),
  ]);
  if (!meUser) return;
  const byId = new Map(people.map((p) => [p.id, p]));

  const waited = Date.now() - me.joinedAt.getTime();
  const cooldown = [...REMATCH_STEPS].reverse().find((s) => waited >= s.waitedMs)!.cooldownMs;
  const recent = cooldown ? await recentPartners(userId, new Date(Date.now() - cooldown)) : new Set<string>();

  for (const c of candidates) {
    const them = byId.get(c.userId);
    if (!them || blocked.has(c.userId) || recent.has(c.userId)) continue;
    // Same campus only when both of you have switched it on.
    if (them.institutionId === meUser.institutionId && !(them.meetSameCampus && meUser.meetSameCampus)) continue;
    const iLikeThem = me.filter === 'all' || c.institutionType === me.filter;
    const theyLikeMe = c.filter === 'all' || me.institutionType === c.filter;
    if (iLikeThem && theyLikeMe && (await pair(userId, c.userId))) return;
  }
}

export async function acceptCall(user: CurrentUser, callerId: string): Promise<boolean> {
  const row = await db.matchQueue.findUnique({ where: { userId: callerId } });
  if (!row || row.status !== 'WAITING' || row.targetUserId !== user.id || Date.now() - row.joinedAt.getTime() > RING_MS) return false;
  if (!(await areFriends(user.id, callerId))) return false;
  await leaveSession(user.id, 'NEXT');
  await db.matchQueue.deleteMany({ where: { userId: user.id } });
  if (!(await claim(callerId, { targetUserId: user.id }))) return false;
  await startSession(user.id, callerId);
  return true;
}

export async function declineCall(user: CurrentUser, callerId: string) {
  const row = await db.matchQueue.findUnique({ where: { userId: callerId } });
  if (row?.targetUserId !== user.id) return;
  await db.message.create({ data: { fromId: callerId, toId: user.id, kind: 'missed_call' } });
  await db.matchQueue.delete({ where: { userId: callerId } });
  await notify([callerId], { type: 'state' });
}

// Bring an online friend into the current call (only once you're friends with the person you're talking to).
export async function inviteToCall(user: CurrentUser, friendId: string): Promise<string | null> {
  const m = await activeMembership(user.id);
  if (!m) return 'You are not in a call.';
  const others = m.session.members.filter((o) => o.userId !== user.id);
  if (m.session.members.length >= MAX_MEMBERS) return 'This call is full.';
  if (!others.length || !(await areFriends(user.id, others[0].userId))) return 'Become friends with this person first.';
  if (others.some((o) => o.userId === friendId)) return 'They are already in the call.';
  if (!(await areFriends(user.id, friendId))) return 'You can only add friends.';
  const friend = await db.user.findUnique({ where: { id: friendId } });
  if (!friend || friend.lastSeen < onlineSince()) return 'They are offline.';
  if (await activeMembership(friendId)) return 'They are in another call.';
  await db.callInvite.updateMany({ where: { sessionId: m.sessionId, toId: friendId, status: 'PENDING' }, data: { status: 'EXPIRED' } });
  await db.callInvite.create({ data: { sessionId: m.sessionId, fromId: user.id, toId: friendId } });
  await notify([friendId], { type: 'state' });
  return null;
}

export async function answerInvite(user: CurrentUser, inviteId: string, accept: boolean): Promise<boolean> {
  const inv = await db.callInvite.findUnique({ where: { id: inviteId } });
  if (!inv || inv.toId !== user.id || inv.status !== 'PENDING' || Date.now() - inv.createdAt.getTime() > RING_MS) return false;
  await db.callInvite.update({ where: { id: inv.id }, data: { status: accept ? 'ACCEPTED' : 'DECLINED' } });
  if (!accept) return true;
  const s = await db.session.findUnique({ where: { id: inv.sessionId }, include: { members: { where: { leftAt: null } } } });
  if (!s || s.endedAt || s.members.length >= MAX_MEMBERS) return false;
  await leaveQueue(user.id, 'NEXT');
  await db.sessionMember.create({ data: { sessionId: s.id, userId: user.id } });
  await notify(s.members.map((x) => x.userId), { type: 'state' });
  return true;
}

export async function matchState(user: CurrentUser) {
  await db.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } });

  // An unanswered friend call becomes a missed call.
  let q = await db.matchQueue.findUnique({ where: { userId: user.id } });
  let notice: string | null = null;
  if (q?.status === 'WAITING' && q.targetUserId && Date.now() - q.joinedAt.getTime() > RING_MS) {
    await leaveQueue(user.id, 'END');
    q = null;
    notice = 'no_answer';
  }
  if (q?.status === 'MATCHED' && Date.now() - q.joinedAt.getTime() > 10_000 && !(await activeMembership(user.id))) {
    await db.matchQueue.update({ where: { userId: user.id }, data: { status: 'WAITING' } });
    q = { ...q, status: 'WAITING' };
  }
  if (q?.status === 'WAITING' && !q.targetUserId) await tryRandomMatch(user.id);

  const ringSince = new Date(Date.now() - RING_MS);
  const [incomingRows, inviteRows] = await Promise.all([
    db.matchQueue.findMany({ where: { status: 'WAITING', targetUserId: user.id, joinedAt: { gte: ringSince } } }),
    db.callInvite.findMany({ where: { toId: user.id, status: 'PENDING', createdAt: { gte: ringSince } } }),
  ]);
  const callers = incomingRows.length
    ? await db.user.findMany({ where: { id: { in: incomingRows.map((r) => r.userId) }, lastSeen: { gte: onlineSince() } } })
    : [];
  const incoming = callers.map((c) => ({ userId: c.id, handle: c.handle, avatarUrl: avatarUrl(c.avatarKey) }));
  const invites = [];
  for (const inv of inviteRows) {
    const members = await db.sessionMember.findMany({ where: { sessionId: inv.sessionId, leftAt: null } });
    const people = await db.user.findMany({ where: { id: { in: members.map((x) => x.userId) } } });
    const from = people.find((p) => p.id === inv.fromId);
    if (!from) continue;
    invites.push({ id: inv.id, fromHandle: from.handle, others: people.filter((p) => p.id !== inv.fromId).map((p) => p.handle) });
  }

  const m = await activeMembership(user.id);
  if (!m) {
    const status = (await db.matchQueue.findUnique({ where: { userId: user.id } })) ? 'waiting' : 'idle';
    const calling = status === 'waiting' ? (await db.matchQueue.findUnique({ where: { userId: user.id } }))?.targetUserId ?? null : null;
    return { status, calling, incoming, invites, notice } as const;
  }

  // Drop people whose page stopped checking in.
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  const others = m.session.members.filter((o) => o.userId !== user.id);
  const users = await db.user.findMany({ where: { id: { in: others.map((o) => o.userId) } }, include: { institution: true } });
  for (const o of others) {
    const u = users.find((x) => x.id === o.userId);
    if (!u || u.isBanned || u.lastSeen.getTime() < cutoff) await leaveSession(o.userId, 'DISCONNECT');
  }
  const still = await activeMembership(user.id);
  if (!still) return { status: 'idle', calling: null, incoming, invites, notice } as const;

  const members = [];
  for (const o of still.session.members.filter((x) => x.userId !== user.id)) {
    const u = users.find((x) => x.id === o.userId);
    if (!u) continue;
    members.push({
      id: u.id,
      handle: u.handle,
      avatarUrl: avatarUrl(u.avatarKey),
      bio: u.bio,
      languages: safeList(u.languages),
      // The exact campus stays hidden until "Reveal Campus" is pressed.
      institutionType: u.institution.institutionType,
      isFriend: await areFriends(user.id, u.id),
      // When these two started talking, for the 30-second friend timer.
      togetherSince: new Date(Math.max(o.joinedAt.getTime(), still.joinedAt.getTime())).toISOString(),
    });
  }
  return { status: 'matched', calling: null, incoming, invites, notice, session: { id: still.sessionId }, members } as const;
}

export async function sharedActiveSession(userId: string, otherId: string, sessionId: string) {
  const rows = await db.sessionMember.findMany({ where: { sessionId, userId: { in: [userId, otherId] }, leftAt: null, session: { endedAt: null } } });
  return rows.length === 2 ? rows : null;
}

export async function makeFriends(userId: string, otherId: string, sessionId: string): Promise<string | null> {
  const rows = await sharedActiveSession(userId, otherId, sessionId);
  if (!rows) return 'Call already ended';
  const since = Math.max(...rows.map((r) => r.joinedAt.getTime()));
  if (Date.now() - since < FRIEND_AFTER_MS - 1000) return 'Not yet';
  const key = pairKey(userId, otherId);
  await db.friendship.upsert({ where: { userAId_userBId: key }, update: {}, create: key });
  await notify([userId, otherId], { type: 'friends' });
  return null;
}
