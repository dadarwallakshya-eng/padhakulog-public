import { db } from '@/lib/db';
import { fail, json, pairKey, readJson, withUser } from '@/lib/http';
import { leaveQueue, sharedActiveSession } from '@/lib/match';
import { REPORT_REASONS } from '@/lib/profile-options';

export async function POST(req: Request) {
  return withUser(async (user) => {
    const { sessionId, userId, reason, description } = await readJson<{ sessionId?: string; userId?: string; reason?: string; description?: string }>(req);
    if (!REPORT_REASONS.includes(reason || '')) return fail('Pick a reason');
    if (!sessionId || !userId || !(await sharedActiveSession(user.id, userId, sessionId))) return fail('Not in this call', 404);

    await db.report.create({ data: { reporterId: user.id, reportedUserId: userId, sessionId, reason: reason!, description: (description || '').slice(0, 500) || null } });
    // Leave the call, never match them again, and drop any friendship.
    await leaveQueue(user.id, 'REPORT');
    await db.blockedUser.upsert({
      where: { userId_blockedUserId: { userId: user.id, blockedUserId: userId } },
      update: {},
      create: { userId: user.id, blockedUserId: userId },
    });
    await db.friendship.deleteMany({ where: pairKey(user.id, userId) });
    return json({ ok: true });
  });
}
