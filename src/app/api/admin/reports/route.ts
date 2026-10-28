import { db } from '@/lib/db';
import { fail, json, readJson, withAdmin } from '@/lib/http';
import { leaveQueue } from '@/lib/match';
import { signOutEverywhere } from '@/lib/session';

export async function POST(req: Request) {
  return withAdmin(async () => {
    const { id, action } = await readJson<{ id?: string; action?: 'resolve' | 'ban' }>(req);
    const report = id ? await db.report.findUnique({ where: { id } }) : null;
    if (!report || !['resolve', 'ban'].includes(action || '')) return fail('Bad request');

    if (action === 'ban') {
      await db.user.update({ where: { id: report.reportedUserId }, data: { isBanned: true } });
      await leaveQueue(report.reportedUserId, 'END');
      await signOutEverywhere(report.reportedUserId);
    }
    await db.report.update({ where: { id: report.id }, data: { status: 'RESOLVED', outcome: action === 'ban' ? 'User banned' : 'Resolved, no action' } });
    return json({ ok: true });
  });
}
