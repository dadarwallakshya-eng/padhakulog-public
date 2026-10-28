import { db } from '@/lib/db';
import { isAcceptableRegistryDomain } from '@/lib/domain';
import { fail, json, readJson, withAdmin } from '@/lib/http';

const TYPES = ['IIT', 'IIM', 'NIT', 'BITS', 'IISc', 'ISB', 'XLRI'];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function POST(req: Request) {
  return withAdmin(async () => {
    const b = await readJson<{ id?: string; name?: string; type?: string; domains?: string[]; active?: boolean }>(req);

    // Toggle active
    if (b.id && typeof b.active === 'boolean' && !b.name) {
      await db.institution.update({ where: { id: b.id }, data: { isActive: b.active } });
      return json({ ok: true });
    }

    const name = (b.name || '').trim();
    const domains = (b.domains || []).map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
    if (!name) return fail('Add a name.');
    if (!TYPES.includes(b.type || '')) return fail('Pick a type.');
    if (!domains.length || !domains.every(isAcceptableRegistryDomain)) return fail('Use full campus domains like nitt.edu. Generic or personal domains cannot be approved.');

    const others = await db.institution.findMany({ where: b.id ? { id: { not: b.id } } : {} });
    const taken = others.find((o) => {
      let list: string[] = [];
      try { list = JSON.parse(o.approvedDomains); } catch { list = []; }
      return [o.primaryDomain, ...list].some((d) => domains.includes(d));
    });
    if (taken) return fail(`A domain is already used by ${taken.name}.`);

    const data = { name, shortName: name, institutionType: b.type!, primaryDomain: domains[0], approvedDomains: JSON.stringify(domains) };
    if (b.id) await db.institution.update({ where: { id: b.id }, data });
    else await db.institution.create({ data: { id: slug(name) || `inst-${Date.now()}`, ...data } });
    return json({ ok: true });
  });
}
