import { db } from './db';
import { checkEmail, type DomainCheck, type RegistryEntry } from './domain';
import { env } from './env';

function domainsOf(primaryDomain: string, approvedDomains: string): string[] {
  let extra: string[] = [];
  try {
    extra = JSON.parse(approvedDomains || '[]');
  } catch {
    extra = [];
  }
  return Array.from(new Set([primaryDomain, ...extra].map((d) => d.trim().toLowerCase()).filter(Boolean)));
}

export async function getRegistry(): Promise<RegistryEntry[]> {
  const rows = await db.institution.findMany({ where: { isActive: true }, orderBy: [{ institutionType: 'desc' }, { name: 'asc' }] });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    shortName: r.shortName,
    institutionType: r.institutionType,
    domains: domainsOf(r.primaryDomain, r.approvedDomains),
  }));
}

// The check the sign-in API uses: the campus registry, plus a short list of invited
// testers (TESTER_EMAILS secret, comma separated) who sign in as a "Guest" campus.
export async function checkSignInEmail(raw: string): Promise<DomainCheck> {
  const check = checkEmail(raw, await getRegistry());
  if (check.kind !== 'bad') return check;
  const email = raw.trim().toLowerCase();
  const testers = (env('TESTER_EMAILS') || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!testers.includes(email)) return check;
  const t = await db.institution.findUnique({ where: { id: 'tester' } });
  if (!t) return check;
  return { kind: 'ok', email, domain: check.domain, institution: { id: t.id, name: t.name, shortName: t.shortName, institutionType: t.institutionType, domains: [] } };
}
