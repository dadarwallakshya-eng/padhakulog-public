import { looksLikeContact } from '@/lib/contact';
import { db } from '@/lib/db';
import { fail, json, readJson, withUser } from '@/lib/http';
import { notify } from '@/lib/live';
import { areFriends } from '@/lib/match';
import { allow, MIN } from '@/lib/ratelimit';

const shape = (m: { id: number; kind: string; text: string; seconds: number | null; flagged: boolean; fromId: string; createdAt: Date }, me: string) => ({
  id: m.id,
  kind: m.kind,
  text: m.text,
  seconds: m.seconds,
  flagged: m.flagged,
  mine: m.fromId === me,
  at: m.createdAt.toISOString(),
});

// Chat is only open between friends. Calls and missed calls show up in the same thread.
export async function GET(req: Request) {
  return withUser(async (user) => {
    const url = new URL(req.url);
    const other = url.searchParams.get('with') || '';
    const after = Number(url.searchParams.get('after') || 0);
    if (!(await areFriends(user.id, other))) return fail('Not friends', 403);
    const rows = await db.message.findMany({
      where: { id: { gt: after }, OR: [{ fromId: user.id, toId: other }, { fromId: other, toId: user.id }] },
      orderBy: { id: 'asc' },
      take: 300,
    });
    return json({ messages: rows.map((m) => shape(m, user.id)) });
  });
}

export async function POST(req: Request) {
  return withUser(async (user) => {
    const { to, text } = await readJson<{ to?: string; text?: string }>(req);
    const body = (text || '').trim().slice(0, 1000);
    if (!to || !body) return fail('Empty message');
    if (!(await areFriends(user.id, to))) return fail('You can chat once you are friends.', 403);
    if (!(await allow(`msg:${user.id}`, [[30, MIN]]))) return fail('Slow down a little.', 429);
    const m = await db.message.create({ data: { fromId: user.id, toId: to, text: body, flagged: looksLikeContact(body) } });
    await notify([to], { type: 'message', from: user.id });
    return json({ message: shape(m, user.id) });
  });
}
