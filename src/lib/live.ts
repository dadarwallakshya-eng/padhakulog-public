import { getCloudflareContext } from '@opennextjs/cloudflare';

// Push an event to users' open pages over the WebSocket hub (cloudflare/hub.ts).
// Events are hints ("something changed, look again") plus WebRTC signals.
// If the hub isn't available (plain `next dev`), pages fall back to polling.
export type LiveEvent =
  | { type: 'state' }
  | { type: 'friends' }
  | { type: 'message'; from: string }
  | { type: 'signal'; signal: { id: number; sessionId: string; from: string; type: string; payload: string } };

export async function notify(userIds: string[], event: LiveEvent) {
  const ids = userIds.filter(Boolean);
  if (!ids.length) return;
  try {
    const env = getCloudflareContext().env as unknown as { HUB?: DurableObjectNamespace };
    if (!env.HUB) return;
    const hub = env.HUB.get(env.HUB.idFromName('global'));
    await hub.fetch('https://hub/notify', { method: 'POST', body: JSON.stringify({ userIds: ids, event }) });
  } catch (err) {
    console.warn('[live] notify failed', err);
  }
}
