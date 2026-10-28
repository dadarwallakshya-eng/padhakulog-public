import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { env } from './env';

// Login sessions live in the database: the cookie holds a random token, the
// database holds only its hash. Deleting the row signs that device out.
const SECURE = process.env.NODE_ENV === 'production';
const USER_COOKIE = SECURE ? '__Host-pl_session' : 'pl_session';
const ADMIN_COOKIE = SECURE ? '__Host-pl_admin' : 'pl_admin';
const USER_TTL_MS = 30 * 86_400_000;
const USER_IDLE_MS = 7 * 86_400_000;
const ADMIN_TTL_MS = 8 * 3_600_000;

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

function secret(): string {
  const s = env('SESSION_SECRET');
  if (!s && SECURE) throw new Error('SESSION_SECRET is not set');
  return s || 'dev-only-insecure-secret';
}

const cookieOpts = (maxAgeMs: number) => ({ httpOnly: true, sameSite: 'lax' as const, secure: SECURE, path: '/', maxAge: Math.floor(maxAgeMs / 1000) });

export async function startUserSession(userId: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  await db.authSession.create({ data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + USER_TTL_MS) } });
  (await cookies()).set(USER_COOKIE, token, cookieOpts(USER_TTL_MS));
}

export async function endUserSession() {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (token) await db.authSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(USER_COOKIE);
}

export async function signOutEverywhere(userId: string) {
  await db.authSession.deleteMany({ where: { userId } });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (!token) return null;
  const s = await db.authSession.findUnique({ where: { tokenHash: sha256(token) } });
  if (!s) return null;
  const now = Date.now();
  if (s.expiresAt.getTime() < now || now - s.lastUsedAt.getTime() > USER_IDLE_MS) {
    await db.authSession.delete({ where: { id: s.id } }).catch(() => {});
    return null;
  }
  const user = await db.user.findUnique({ where: { id: s.userId }, include: { institution: true } });
  if (!user || user.isBanned || !user.emailVerified) return null;
  if (now - s.lastUsedAt.getTime() > 60_000) await db.authSession.update({ where: { id: s.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// --- Admin (a signed cookie; production adds Cloudflare Access in front) ---

function sign(value: string): string {
  return `${value}.${crypto.createHmac('sha256', secret()).update(value).digest('base64url')}`;
}

function verifySigned(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const value = token.slice(0, i);
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  const exp = Number(value.split(':')[1]);
  return exp > Date.now() ? value : null;
}

export async function startAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, sign(`admin:${Date.now() + ADMIN_TTL_MS}`), cookieOpts(ADMIN_TTL_MS));
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  return verifySigned((await cookies()).get(ADMIN_COOKIE)?.value)?.startsWith('admin:') ?? false;
}

export function checkAdminPassword(input: string): boolean {
  const expected = env('ADMIN_PASSWORD');
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
