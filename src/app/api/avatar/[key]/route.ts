import { readAvatar } from '@/lib/avatars';
import { getCurrentUser, isAdmin } from '@/lib/session';

// Pictures are only served to signed-in students (and admins), never publicly.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!(await isAdmin()) && !(await getCurrentUser())) return new Response('Not found', { status: 404 });
  const buf = await readAvatar(key);
  if (!buf) return new Response('Not found', { status: 404 });
  return new Response(buf, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}
