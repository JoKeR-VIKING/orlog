import seedrandom from 'seedrandom';

export function createRNG(seed: string) {
  return seedrandom(seed);
}

export function randomCode(len = 6): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous O/0/I/1/L
  let s = '';
  for (let i = 0; i < len; i++) {
    s += letters[Math.floor(Math.random() * letters.length)];
  }
  return s;
}

export function randomSeed(): string {
  return (
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  ).toUpperCase();
}
