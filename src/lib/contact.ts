// Spots messages that look like they share a way to reach someone off the site
// (phone number, email, Instagram/Snap handle, link). We warn, we don't block.
const PATTERNS = [
  /(?:\+?91[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/, // Indian mobile numbers
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, // email addresses
  /(?:^|\s)@[a-z0-9._]{3,}/i, // @handles
  /\b(?:insta(?:gram)?|snap(?:chat)?|whats\s?app|telegram|discord|my id|dm me)\b/i,
  /\b(?:https?:\/\/|www\.)\S+/i,
  /\b[a-z0-9]+(?:[._][a-z0-9]+){1,}\b/i, // things like rahul_sharma or name.surname
];

export function looksLikeContact(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  // The last pattern is broad, so only use it for short single-token messages.
  const singleToken = !/\s/.test(t) && t.length <= 30;
  return PATTERNS.slice(0, -1).some((p) => p.test(t)) || (singleToken && PATTERNS.at(-1)!.test(t));
}
