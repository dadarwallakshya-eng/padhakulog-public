// Strict institutional email validation. Shared by the sign-in card (instant
// feedback) and the API (the check that actually counts).

export interface RegistryEntry {
  id: string;
  name: string;
  shortName: string;
  institutionType: string;
  domains: string[]; // primaryDomain + approvedDomains, lowercase
}

export type DomainCheck =
  | { kind: 'empty' }
  | { kind: 'typing' }
  | { kind: 'ok'; email: string; domain: string; institution: RegistryEntry }
  | { kind: 'bad'; domain: string; title: string; body: string; reason: 'personal' | 'generic' | 'unknown' };

export const FREE_MAIL = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com', 'live.com',
  'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'rediffmail.com', 'aol.com', 'zoho.com',
];

// Generic academic or government suffixes that never identify a single campus.
export const GENERIC_SUFFIXES = ['ac.in', 'edu', 'edu.in', 'res.in', 'gov.in', 'nic.in'];

export function normalizeEmail(raw: string): { email: string; domain: string | null } {
  const email = (raw || '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return { email, domain: null };
  return { email, domain: email.slice(at + 1) };
}

export function checkEmail(raw: string, registry: RegistryEntry[]): DomainCheck {
  const { email, domain } = normalizeEmail(raw);
  if (!email) return { kind: 'empty' };
  if (!domain || domain.indexOf('.') < 1 || domain.endsWith('.')) return { kind: 'typing' };

  // Exact match only: no substrings, no suffix matching, no guessing from the username.
  const institution = registry.find((r) => r.domains.includes(domain));
  if (institution) return { kind: 'ok', email, domain, institution };

  if (FREE_MAIL.includes(domain)) {
    return { kind: 'bad', domain, title: 'Personal email is not accepted', body: `Use the mailbox issued by your institute, not ${domain}.`, reason: 'personal' };
  }
  if (GENERIC_SUFFIXES.includes(domain)) {
    return { kind: 'bad', domain, title: 'Generic academic domain', body: `@${domain} alone does not identify a campus. Use your exact institute domain.`, reason: 'generic' };
  }
  return { kind: 'bad', domain, title: 'Domain not on the approved registry', body: `@${domain} does not exactly match any approved campus domain.`, reason: 'unknown' };
}

export function isAcceptableRegistryDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase().replace(/^@/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) && !FREE_MAIL.includes(d) && !GENERIC_SUFFIXES.includes(d);
}
