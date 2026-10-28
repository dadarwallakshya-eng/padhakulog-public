import { fail, json, readJson, withUser } from '@/lib/http';
import { makeFriends } from '@/lib/match';

// Called once two people have talked for 30 seconds without skipping.
// The server checks the clock itself, so the client can't fast-forward it.
export async function POST(req: Request) {
  return withUser(async (user) => {
    const { sessionId, userId } = await readJson<{ sessionId?: string; userId?: string }>(req);
    if (!sessionId || !userId || userId === user.id) return fail('Bad request');
    const err = await makeFriends(user.id, userId, sessionId);
    return err ? fail(err, 409) : json({ ok: true });
  });
}
