import seedrandom from 'seedrandom';

export function createRNG(seed: string) {
  return seedrandom(seed);
}
