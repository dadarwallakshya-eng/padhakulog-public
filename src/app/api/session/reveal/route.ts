import { db } from '@/lib/db';
import { fail, json, readJson, withUser } from '@/lib/http';
import { sharedActiveSession } from '@/lib/match';

export async function POST(req: Request) {
  return withUser(async (user) => {
    const { sessionId, userId } = await readJson<{ sessionId?: string; userId?: string }>(req);
    if (!sessionId || !userId || !(await sharedActiveSession(user.id, userId, sessionId))) return fail('Not in this call', 404);
    const other = await db.user.findUnique({ where: { id: userId }, include: { institution: true } });
    if (!other) return fail('Not found', 404);
    return json({ campus: other.institution.name, type: other.institution.institutionType });
  });
}
