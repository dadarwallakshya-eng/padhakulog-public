import crypto from 'crypto';

// Anonymous IDs are always Adjective + Noun + 3 digits, built only from these
// lists, so nobody can put their real name in one.
const ADJECTIVES = [
  'Bright', 'Calm', 'Chill', 'Clever', 'Cosmic', 'Curious', 'Dapper', 'Eager', 'Fuzzy', 'Gentle', 'Glossy', 'Golden', 'Happy', 'Hopeful',
  'Jolly', 'Kind', 'Lively', 'Lucky', 'Mellow', 'Mighty', 'Nimble', 'Noble', 'Peppy', 'Plucky', 'Quiet', 'Quirky', 'Rapid', 'Rustic',
  'Sleepy', 'Snappy', 'Sonic', 'Spicy', 'Stellar', 'Sunny', 'Swift', 'Tidy', 'Witty', 'Zesty', 'Breezy', 'Cheery',
];
const NOUNS = [
  'Owl', 'Panda', 'Tiger', 'Falcon', 'Otter', 'Koala', 'Mango', 'Samosa', 'Chai', 'Jalebi', 'Comet', 'Nebula', 'Pixel', 'Rocket', 'Lotus',
  'Peacock', 'Parrot', 'Dolphin', 'Gecko', 'Lynx', 'Bison', 'Heron', 'Badger', 'Walrus', 'Cactus', 'Maple', 'Pebble', 'Kite', 'Lantern',
  'Teacup', 'Biscuit', 'Pudding', 'Meteor', 'Quokka', 'Puffin', 'Yak', 'Sparrow', 'Mongoose', 'Laddoo', 'Pakora',
];

const pick = <T,>(list: T[]) => list[crypto.randomInt(0, list.length)];

export function randomHandle(): string {
  return `${pick(ADJECTIVES)}${pick(NOUNS)}${crypto.randomInt(100, 1000)}`;
}

export function isValidHandle(handle: string): boolean {
  const m = /^([A-Z][a-z]+)([A-Z][a-z]+)(\d{3})$/.exec(handle || '');
  return !!m && ADJECTIVES.includes(m[1]) && NOUNS.includes(m[2]);
}
