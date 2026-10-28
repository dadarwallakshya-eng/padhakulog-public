import { AVATAR_MAX_BYTES, deleteAvatar, isJpeg, saveAvatar } from '@/lib/avatars';
import { db } from '@/lib/db';
import { fail, json, withUser } from '@/lib/http';
import { avatarUrl } from '@/lib/match';
import { allow, DAY } from '@/lib/ratelimit';

export async function POST(req: Request) {
  return withUser(async (user) => {
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.length > AVATAR_MAX_BYTES) return fail('Picture is too large.', 413);
    if (!isJpeg(buf)) return fail('Upload a JPEG, PNG or WebP picture.');
    if (!(await allow(`avatar:${user.id}`, [[5, DAY]]))) return fail('You can change your picture 5 times a day.', 429);
    const key = await saveAvatar(buf);
    await db.user.update({ where: { id: user.id }, data: { avatarKey: key } });
    await deleteAvatar(user.avatarKey);
    return json({ avatarUrl: avatarUrl(key) });
  }, { requireOnboarded: false });
}

export async function DELETE() {
  return withUser(async (user) => {
    await db.user.update({ where: { id: user.id }, data: { avatarKey: null } });
    await deleteAvatar(user.avatarKey);
    return json({ avatarUrl: null });
  }, { requireOnboarded: false });
}
