import { env } from '@/lib/env';
import { json, withUser } from '@/lib/http';

// ICE servers for video calls. With Cloudflare TURN keys set as secrets, every call is
// forced through the relay ("relay only"), so nobody ever sees another user's
// IP address. Without keys (local development), calls fall back to STUN and
// connect directly, which exposes IPs: never ship that to real users.
export async function GET() {
  return withUser(async () => {
    const keyId = env('CLOUDFLARE_TURN_KEY_ID');
    const token = env('CLOUDFLARE_TURN_API_TOKEN');
    if (keyId && token) {
      const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 4 * 3600 }),
        cache: 'no-store',
      }).catch(() => null);
      if (res?.ok) {
        const data = (await res.json()) as { iceServers: { urls: string[] | string; username?: string; credential?: string }[] };
        // Browsers block port 53; drop those URLs so ICE doesn't wait on them.
        const iceServers = data.iceServers.map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }));
        return json({ iceServers, relayOnly: true });
      }
      console.error('[ice] Cloudflare TURN credentials failed', res?.status);
    }
    return json({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }], relayOnly: false });
  });
}
