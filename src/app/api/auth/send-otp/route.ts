import { fail, json, readJson } from '@/lib/http';
import { issueOtp } from '@/lib/otp';
import { checkSignInEmail } from '@/lib/registry';

export async function POST(req: Request) {
  const { email } = await readJson<{ email?: string }>(req);
  const check = await checkSignInEmail(email || '');
  if (check.kind !== 'ok') return fail(check.kind === 'bad' ? check.title : 'Enter your full institute email.');

  const result = await issueOtp(check.email);
  if (!result.ok) return json({ error: result.error, retryInMs: result.retryInMs }, 429);
  return json({ ok: true, institution: check.institution.name, devCode: result.devCode });
}
