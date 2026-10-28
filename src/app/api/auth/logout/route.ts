import { json, readJson } from '@/lib/http';
import { leaveQueue } from '@/lib/match';
import { endUserSession, getCurrentUser, signOutEverywhere } from '@/lib/session';

export async function POST(req: Request) {
  const { everywhere } = await readJson<{ everywhere?: boolean }>(req);
  const user = await getCurrentUser();
  if (user) {
    await leaveQueue(user.id, 'END');
    if (everywhere) await signOutEverywhere(user.id);
  }
  await endUserSession();
  return json({ ok: true });
}
