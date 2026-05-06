import seedrandom from 'seedrandom';

export function createRNG(seed: string) {
  return seedrandom(seed);
}

function cryptoRandomUint32(): number | null {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') return null;
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? null;
}

function randomIndex(length: number): number {
  const value = cryptoRandomUint32();
  if (value !== null) return value % length;
  return Math.floor(Math.random() * length);
}

export function randomCode(len = 6): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous O/0/I/1/L
  let s = '';
  for (let i = 0; i < len; i++) {
    s += letters[randomIndex(letters.length)];
  }
  return s;
}

export function randomSeed(): string {
  const value = cryptoRandomUint32();
  if (value !== null) {
    const extra = crypto.getRandomValues(new Uint32Array(3));
    return Array.from(extra, (part) => part.toString(36)).join('').concat(value.toString(36)).toUpperCase();
  }
  return (Math.random().toString(36).slice(2) + Date.now().toString(36)).toUpperCase();
}
