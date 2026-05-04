import { create } from 'zustand';

import { rollDice } from '../game/engine.ts';

type Phase = 'idle' | 'covering' | 'shaking' | 'revealing';

type GameState = {
  phase: Phase;
  dice: number[];
  roll: () => void;
};

export const useGameStore = create<GameState>((set) => ({
  phase: 'idle',
  dice: [1, 1, 1, 1, 1, 1],

  roll: () => {
    const seed = Date.now().toString();
    const result = rollDice(seed);

    set({ phase: 'covering' });

    setTimeout(() => set({ phase: 'shaking' }), 300);
    setTimeout(() => set({ phase: 'revealing', dice: result }), 1200);
    setTimeout(() => set({ phase: 'idle' }), 1600);
  },
}));
