import { db } from '@/lib/db';
import { fail, json, readJson, withUser } from '@/lib/http';
import { notify } from '@/lib/live';
import { sharedActiveSession } from '@/lib/match';

// WebRTC signaling relay. Offers, answers and ICE candidates are stored briefly
// and picked up by the other side's poll. One connection per pair of people.
export async function GET(req: Request) {
  return withUser(async (user) => {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId') || '';
    const after = Number(url.searchParams.get('after') || 0);
    const signals = await db.signal.findMany({ where: { sessionId, toUserId: user.id, id: { gt: after } }, orderBy: { id: 'asc' }, take: 200 });
    return json({ signals: signals.map((s) => ({ id: s.id, from: s.fromUserId, type: s.type, payload: s.payload })) });
  });
}

export async function POST(req: Request) {
  return withUser(async (user) => {
    const b = await readJson<{ sessionId?: string; to?: string; type?: string; payload?: unknown }>(req);
    if (!b.sessionId || !b.to || !['offer', 'answer', 'ice'].includes(b.type || '')) return fail('Bad signal');
    if (!(await sharedActiveSession(user.id, b.to, b.sessionId))) return fail('Not in this call', 410);
    const payload = JSON.stringify(b.payload ?? null);
    if (payload.length > 20_000) return fail('Signal too large', 413);
    const sig = await db.signal.create({ data: { sessionId: b.sessionId, fromUserId: user.id, toUserId: b.to, type: b.type!, payload } });
    // Delivered instantly over the WebSocket; the stored copy is the fallback for polling.
    await notify([b.to], { type: 'signal', signal: { id: sig.id, sessionId: sig.sessionId, from: user.id, type: sig.type, payload } });
    return json({ ok: true });
  });
}
