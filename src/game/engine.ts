import { createRNG } from './rng.ts';

export function rollDice(seed: string, count = 0) {
  const rng = createRNG(seed);
  return Array.from({ length: count }, () => {
    return Math.floor(rng() * 6) + 1;
  });
}
