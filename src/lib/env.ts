import { getCloudflareContext } from '@opennextjs/cloudflare';

// Reads a secret or setting. On Cloudflare these are Worker secrets
// (`wrangler secret put`); locally they come from .dev.vars. Secrets must
// never live in .env files: the build bundles those into the Worker.
export function env(name: string): string | undefined {
  try {
    const value = (getCloudflareContext().env as unknown as Record<string, unknown>)[name];
    if (typeof value === 'string' && value) return value;
  } catch {
    /* outside a request (build time) */
  }
  return process.env[name] || undefined;
}
