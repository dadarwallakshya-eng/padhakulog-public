import { json } from '@/lib/http';
import { getRegistry } from '@/lib/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json({ institutions: await getRegistry() });
}
