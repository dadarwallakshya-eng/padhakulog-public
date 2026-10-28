import { db } from '@/lib/db';
import { fail, json, readJson, withAdmin } from '@/lib/http';
import { leaveQueue } from '@/lib/match';
import { signOutEverywhere } from '@/lib/session';

export async function POST(req: Request) {
  return withAdmin(async () => {
    const { id, banned } = await readJson<{ id?: string; banned?: boolean }>(req);
    if (!id || typeof banned !== 'boolean') return fail('Bad request');
    await db.user.update({ where: { id }, data: { isBanned: banned } });
    if (banned) {
      await leaveQueue(id, 'END');
      await signOutEverywhere(id);
    }
    return json({ ok: true });
  });
}
