import { getCloudflareContext } from '@opennextjs/cloudflare';
import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@/generated/prisma/client';

// The database is Cloudflare D1, reached through the request's DB binding.
// `db` looks like a normal Prisma client; under the hood it picks the client
// for the current request's D1 binding (one client per binding, reused).
const clients = new WeakMap<object, PrismaClient>();

function client(): PrismaClient {
  const d1 = getCloudflareContext().env.DB;
  let c = clients.get(d1);
  if (!c) {
    c = new PrismaClient({ adapter: new PrismaD1(d1) });
    clients.set(d1, c);
  }
  return c;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === 'function' ? value.bind(c) : value;
  },
});

// A student counts as online if their page has checked in recently
// (the page sends a heartbeat every ~10 seconds).
export const ONLINE_WINDOW_MS = 30_000;
export const FRIEND_AFTER_MS = 30_000;

export const onlineSince = () => new Date(Date.now() - ONLINE_WINDOW_MS);
