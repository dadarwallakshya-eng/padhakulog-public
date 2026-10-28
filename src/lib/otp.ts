import crypto from 'crypto';
import { db } from './db';
import { mailProvider, sendOtpEmail } from './mailer';
import { allow, clientIp, DAY, HOUR, MIN } from './ratelimit';
import { env } from './env';

export const OTP_TTL_MS = 10 * MIN;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

// HMAC with a server-only key. A plain hash of a 6-digit code could be
// reversed in under a second if the database ever leaked.
function hmac(email: string, code: string): string {
  const key = env('OTP_PEPPER') || env('SESSION_SECRET');
  if (!key) throw new Error('OTP_PEPPER is not set');
  return crypto.createHmac('sha256', key).update(`${email}:${code}`).digest('hex');
}

// Without an email provider, the code can be shown on the page: always in
// `next dev`, and in a local Cloudflare preview only if .dev.vars says so.
// Never set UNSAFE_SHOW_OTP_ON_PAGE on the real site.
const showCodeOnPage = () => process.env.NODE_ENV !== 'production' || env('UNSAFE_SHOW_OTP_ON_PAGE') === '1';

type IssueResult = { ok: true; devCode?: string } | { ok: false; error: string; retryInMs?: number };

export async function issueOtp(email: string): Promise<IssueResult> {
  const last = await db.otpCode.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } });
  if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false, error: 'Please wait a moment before requesting another code.', retryInMs: OTP_RESEND_COOLDOWN_MS - (Date.now() - last.createdAt.getTime()) };
  }
  // Stops email bombing and guessing across many codes.
  if (!(await allow(`otp-ip:${await clientIp()}`, [[20, HOUR]]))) return { ok: false, error: 'Too many requests from this network. Try again later.' };
  if (!(await allow(`otp-email:${email}`, [[3, 15 * MIN], [10, DAY]]))) return { ok: false, error: 'Too many codes for this email today. Try again later.' };

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

  if (mailProvider()) {
    try {
      await sendOtpEmail(email, code);
    } catch (err) {
      console.error('[otp] email failed:', err);
      return { ok: false, error: 'We could not send the email right now. Try again in a minute.' };
    }
  } else if (!showCodeOnPage()) {
    return { ok: false, error: 'Sign-in is temporarily unavailable.' };
  }

  await db.otpCode.deleteMany({ where: { email } });
  await db.otpCode.create({ data: { email, code: hmac(email, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });

  if (mailProvider()) return { ok: true };
  // No email provider in .env yet: show the code on the page (development only).
  console.log(`[otp] no email provider set, code for ${email} is ${code}`);
  return { ok: true, devCode: code };
}

export async function checkOtp(email: string, input: string): Promise<{ ok: true } | { ok: false; error: string; attemptsLeft: number }> {
  if (!(await allow(`verify-ip:${await clientIp()}`, [[30, HOUR]]))) return { ok: false, error: 'Too many attempts from this network. Try again later.', attemptsLeft: 0 };

  const row = await db.otpCode.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } });
  if (!row) return { ok: false, error: 'No active code. Request a new one.', attemptsLeft: 0 };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: 'Too many attempts. Request a new code.', attemptsLeft: 0 };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: 'This code has expired. Request a new one.', attemptsLeft: 0 };

  const given = Buffer.from(hmac(email, (input || '').trim()));
  const stored = Buffer.from(row.code);
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
    const attempts = row.attempts + 1;
    await db.otpCode.update({ where: { id: row.id }, data: { attempts } });
    const attemptsLeft = OTP_MAX_ATTEMPTS - attempts;
    return { ok: false, error: attemptsLeft > 0 ? 'That code is not valid. Check your inbox and try again.' : 'Too many attempts. Request a new code.', attemptsLeft };
  }

  await db.otpCode.deleteMany({ where: { email } });
  return { ok: true };
}
