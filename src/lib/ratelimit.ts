import { headers } from 'next/headers';
import { db } from './db';

// Returns true if this action is allowed, and records it. `limits` are
// [maxEvents, windowMs] pairs that must all hold, e.g. [[3, 15 min], [10, 1 day]].
export async function allow(key: string, limits: [number, number][]): Promise<boolean> {
  const longest = Math.max(...limits.map(([, w]) => w));
  const since = new Date(Date.now() - longest);
  const events = await db.rateEvent.findMany({ where: { key, at: { gte: since } }, select: { at: true } });
  for (const [max, windowMs] of limits) {
    const from = Date.now() - windowMs;
    if (events.filter((e) => e.at.getTime() >= from).length >= max) return false;
  }
  await db.rateEvent.create({ data: { key } });
  // Opportunistic cleanup of old rows.
  if (Math.random() < 0.02) await db.rateEvent.deleteMany({ where: { at: { lt: new Date(Date.now() - 2 * 86_400_000) } } });
  return true;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
}

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
