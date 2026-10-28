import { db, onlineSince, FRIEND_AFTER_MS } from '@/lib/db';
import { json, withAdmin } from '@/lib/http';

export async function GET() {
  return withAdmin(async () => {
    const since = onlineSince();
    const [verified, waiting, activeInst, totalInst, sessions, ended, reportsCount, reports, users, institutions] = await Promise.all([
      db.user.count({ where: { emailVerified: true } }),
      db.matchQueue.findMany({ where: { status: 'WAITING' }, select: { userId: true } }),
      db.institution.count({ where: { isActive: true } }),
      db.institution.count(),
      db.session.count(),
      db.session.findMany({ where: { endedAt: { not: null } }, select: { startedAt: true, endedAt: true, endReason: true }, take: 2000, orderBy: { startedAt: 'desc' } }),
      db.report.count(),
      db.report.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      db.user.findMany({ orderBy: { lastSeen: 'desc' }, take: 200, include: { institution: true } }),
      db.institution.findMany({ orderBy: [{ institutionType: 'desc' }, { name: 'asc' }] }),
    ]);
    const onlineInQueue = waiting.length
      ? await db.user.count({ where: { id: { in: waiting.map((w) => w.userId) }, lastSeen: { gte: since } } })
      : 0;
    const quickSkips = ended.filter((s) => s.endReason === 'NEXT' && s.endedAt!.getTime() - s.startedAt.getTime() < FRIEND_AFTER_MS).length;

    const ids = Array.from(new Set(reports.flatMap((r) => [r.reporterId, r.reportedUserId])));
    const people = await db.user.findMany({ where: { id: { in: ids } }, include: { institution: true } });
    const who = (id: string) => people.find((p) => p.id === id);

    return json({
      metrics: {
        verified,
        onlineInQueue,
        activeInstitutions: activeInst,
        totalInstitutions: totalInst,
        matches: sessions,
        skipRate: ended.length ? quickSkips / ended.length : 0,
        reportRate: sessions ? reportsCount / sessions : 0,
      },
      reports: reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        outcome: r.outcome,
        sessionId: r.sessionId,
        createdAt: r.createdAt.toISOString(),
        reported: { id: r.reportedUserId, name: who(r.reportedUserId)?.handle || 'Unknown', campus: who(r.reportedUserId)?.institution.name || '' },
        reporterCampus: who(r.reporterId)?.institution.name || '',
      })),
      users: users.map((u) => ({
        id: u.id,
        name: u.handle,
        campus: u.institution.name,
        banned: u.isBanned,
        online: u.lastSeen >= since,
        lastSeen: u.lastSeen.toISOString(),
      })),
      institutions: institutions.map((i) => ({
        id: i.id,
        name: i.name,
        shortName: i.shortName,
        type: i.institutionType,
        primaryDomain: i.primaryDomain,
        approvedDomains: (() => { try { return JSON.parse(i.approvedDomains) as string[]; } catch { return [i.primaryDomain]; } })(),
        active: i.isActive,
      })),
    });
  });
}
