import { db, onlineSince } from '@/lib/db';
import { json, withUser } from '@/lib/http';
import { avatarUrl } from '@/lib/match';

export async function GET() {
  return withUser(async (user) => {
    const rows = await db.friendship.findMany({ where: { OR: [{ userAId: user.id }, { userBId: user.id }] }, orderBy: { createdAt: 'desc' } });
    const ids = rows.map((r) => (r.userAId === user.id ? r.userBId : r.userAId));
    if (!ids.length) return json({ friends: [] });

    const [users, mine, messages] = await Promise.all([
      db.user.findMany({ where: { id: { in: ids }, isBanned: false }, include: { institution: true } }),
      db.sessionMember.findFirst({ where: { userId: user.id, leftAt: null, session: { endedAt: null } }, include: { session: { include: { members: { where: { leftAt: null } } } } } }),
      db.message.findMany({ where: { OR: [{ fromId: user.id, toId: { in: ids } }, { toId: user.id, fromId: { in: ids } }] }, orderBy: { id: 'desc' }, take: 500 }),
    ]);
    const inCall = new Set(mine?.session.members.map((m) => m.userId) ?? []);
    const busy = new Set(
      (await db.sessionMember.findMany({ where: { userId: { in: ids }, leftAt: null, session: { endedAt: null } }, select: { userId: true } })).map((r) => r.userId),
    );
    const since = onlineSince().getTime();

    const friends = users.map((u) => {
      const last = messages.find((m) => m.fromId === u.id || m.toId === u.id);
      return {
        id: u.id,
        handle: u.handle,
        avatarUrl: avatarUrl(u.avatarKey),
        campus: u.institution.name, // friends can see each other's campus
        online: u.lastSeen.getTime() >= since,
        lastSeen: u.lastSeen.toISOString(),
        inCall: inCall.has(u.id),
        busy: busy.has(u.id) && !inCall.has(u.id),
        lastMessage: last ? { kind: last.kind, text: last.text, seconds: last.seconds, mine: last.fromId === user.id, at: last.createdAt.toISOString() } : null,
      };
    });
    return json({ friends });
  });
}
