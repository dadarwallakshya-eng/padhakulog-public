import { getCloudflareContext } from '@opennextjs/cloudflare';

// Profile pictures live in a private Cloudflare R2 bucket (binding AVATARS)
// under random names, and are only served to signed-in students. Before real
// users, every upload should also pass an automatic nudity check.
export const AVATAR_MAX_BYTES = 200 * 1024;
const KEY_RE = /^[a-f0-9]{32}\.jpg$/;

const bucket = () => getCloudflareContext().env.AVATARS;

// The browser re-encodes every picture to a small JPEG before upload, which
// also strips hidden location data (EXIF). The server only accepts real JPEGs.
export function isJpeg(buf: Uint8Array) {
  return buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
}

export async function saveAvatar(buf: Uint8Array): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const key = `${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}.jpg`;
  await bucket().put(key, buf, { httpMetadata: { contentType: 'image/jpeg' } });
  return key;
}

export async function deleteAvatar(key: string | null | undefined) {
  if (key && KEY_RE.test(key)) await bucket().delete(key).catch(() => {});
}

export async function readAvatar(key: string): Promise<ArrayBuffer | null> {
  if (!KEY_RE.test(key)) return null;
  const obj = await bucket().get(key);
  return obj ? obj.arrayBuffer() : null;
}
