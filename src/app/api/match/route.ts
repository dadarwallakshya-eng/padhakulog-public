import { db } from '@/lib/db';
import { fail, json, readJson, withUser } from '@/lib/http';
import { acceptCall, answerInvite, asFilter, declineCall, inviteToCall, joinQueue, leaveQueue, matchState } from '@/lib/match';

// Polled every ~1.5s by the video page: doubles as the presence heartbeat.
export async function GET() {
  return withUser(async (user) => json(await matchState(user)));
}

interface Body {
  action?: 'prefs' | 'join' | 'leave' | 'call' | 'accept' | 'decline' | 'invite' | 'invite-accept' | 'invite-decline';
  filter?: string;
  sameCampus?: boolean;
  userId?: string;
  inviteId?: string;
}

export async function POST(req: Request) {
  return withUser(async (user) => {
    const b = await readJson<Body>(req);
    switch (b.action) {
      case 'prefs':
        if (typeof b.sameCampus === 'boolean') await db.user.update({ where: { id: user.id }, data: { meetSameCampus: b.sameCampus } });
        break;
      case 'join':
        await joinQueue(user, asFilter(b.filter), null, typeof b.sameCampus === 'boolean' ? b.sameCampus : undefined);
        break;
      case 'call':
        if (!b.userId) return fail('Missing friend');
        await joinQueue(user, 'all', b.userId);
        break;
      case 'accept':
        if (!b.userId || !(await acceptCall(user, b.userId))) return fail('That call is no longer available.', 409);
        break;
      case 'decline':
        if (b.userId) await declineCall(user, b.userId);
        break;
      case 'invite': {
        if (!b.userId) return fail('Pick a friend');
        const err = await inviteToCall(user, b.userId);
        if (err) return fail(err, 409);
        break;
      }
      case 'invite-accept':
      case 'invite-decline':
        if (!b.inviteId || !(await answerInvite(user, b.inviteId, b.action === 'invite-accept'))) return fail('That invite is no longer available.', 409);
        break;
      case 'leave':
        await leaveQueue(user.id, 'END');
        break;
      default:
        return fail('Unknown action');
    }
    return json(await matchState(user));
  });
}
