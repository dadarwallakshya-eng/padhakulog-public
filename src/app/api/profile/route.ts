import { db } from '@/lib/db';
import { looksLikeContact } from '@/lib/contact';
import { isValidHandle, randomHandle } from '@/lib/handle';
import { fail, json, readJson, withUser } from '@/lib/http';
import { BIO_MAX, GENDERS, LANGUAGES, MAX_LANGUAGES } from '@/lib/profile-options';

interface Body {
  handle?: string;
  bio?: string;
  languages?: string[];
  gender?: string;
  ageVerified?: boolean;
}

// A fresh, unused anonymous ID for the "shuffle" button.
export async function GET() {
  return withUser(async () => {
    for (let i = 0; i < 20; i++) {
      const h = randomHandle();
      if (!(await db.user.findUnique({ where: { handle: h } }))) return json({ handle: h });
    }
    return fail('Try again', 503);
  }, { requireOnboarded: false });
}

export async function POST(req: Request) {
  return withUser(async (user) => {
    const b = await readJson<Body>(req);
    if (b.ageVerified !== true) return fail('You must confirm you are 18 or older.');

    const handle = (b.handle || user.handle).trim();
    if (!isValidHandle(handle)) return fail('Pick an ID with the shuffle button.');
    if (handle !== user.handle && (await db.user.findUnique({ where: { handle } }))) return fail('That ID was just taken. Shuffle again.');

    const bio = (b.bio || '').replace(/\s+/g, ' ').trim().slice(0, BIO_MAX);
    if (bio && looksLikeContact(bio)) return fail('Keep contact details (numbers, IDs, links) out of your bio.');
    const languages = Array.from(new Set((Array.isArray(b.languages) ? b.languages : []).filter((l) => LANGUAGES.includes(l)))).slice(0, MAX_LANGUAGES);
    const gender = GENDERS.includes(b.gender || '') && b.gender !== GENDERS[0] ? b.gender! : null;

    await db.user.update({
      where: { id: user.id },
      data: { handle, bio: bio || null, languages: JSON.stringify(languages), gender, ageVerified: true, onboarded: true },
    });
    return json({ ok: true });
  }, { requireOnboarded: false });
}
