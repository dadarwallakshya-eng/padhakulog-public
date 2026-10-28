import { db } from '@/lib/db';
import { randomHandle } from '@/lib/handle';
import { fail, json, readJson } from '@/lib/http';
import { checkOtp } from '@/lib/otp';
import { checkSignInEmail } from '@/lib/registry';
import { startUserSession } from '@/lib/session';

async function freshHandle() {
  for (let i = 0; i < 20; i++) {
    const h = randomHandle();
    if (!(await db.user.findUnique({ where: { handle: h } }))) return h;
  }
  throw new Error('no free handle');
}

export async function POST(req: Request) {
  const { email, code } = await readJson<{ email?: string; code?: string }>(req);
  const check = await checkSignInEmail(email || '');
  if (check.kind !== 'ok') return fail('This email is not on the approved registry.');
  if (!/^\d{6}$/.test((code || '').trim())) return fail('Enter the 6-digit code.');

  const result = await checkOtp(check.email, code!);
  if (!result.ok) return json({ error: result.error, attemptsLeft: result.attemptsLeft }, 400);

  const existing = await db.user.findUnique({ where: { email: check.email } });
  if (existing?.isBanned) return fail('This account has been suspended for breaking the Safety Guidelines.', 403);
  const user = existing
    ? await db.user.update({ where: { id: existing.id }, data: { emailVerified: true, institutionId: check.institution.id, lastSeen: new Date() } })
    : await db.user.create({ data: { email: check.email, emailVerified: true, institutionId: check.institution.id, handle: await freshHandle() } });

  await startUserSession(user.id);
  return json({ ok: true, institution: check.institution.name, next: user.onboarded ? '/roulette' : '/onboarding' });
}
