import { fail, json, readJson } from '@/lib/http';
import { checkAdminPassword, endAdminSession, startAdminSession } from '@/lib/session';

export async function POST(req: Request) {
  const { password } = await readJson<{ password?: string }>(req);
  if (!password || !checkAdminPassword(password)) return fail('Wrong password', 401);
  await startAdminSession();
  return json({ ok: true });
}

export async function DELETE() {
  await endAdminSession();
  return json({ ok: true });
}
