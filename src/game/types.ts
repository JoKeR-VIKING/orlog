// Orlog game types
export type DieFace = 'axe' | 'arrow' | 'helmet' | 'shield' | 'steal' | 'earn';

export const DIE_FACE_ORDER: DieFace[] = [
  'axe',
  'arrow',
  'helmet',
  'shield',
  'steal',
  'earn',
];

// A single die in a player's pool
export interface Die {
  id: number; // 0..5 within the player's 6 dice
  face: DieFace;
  kept: boolean; // kept between rerolls
  selected: boolean; // selected during the current lock action, not committed yet
}

export type PlayerSide = 'host' | 'guest';

export type Phase =
  | 'roll' // both players rolling / choosing keeps
  | 'favor' // both players choosing god favors
  | 'resolve' // animation of resolution
  | 'round-end' // brief pause between rounds
  | 'game-over';

export interface PlayerState {
  name: string;
  hp: number;
  favor: number; // currency ⌘
  dice: Die[];
  rollsLeft: number; // remaining rolls this round (starts at 3)
  turnRolled: boolean; // true after this player's current turn roll, before locking/passing
  ready: boolean; // ready to move to favor phase (finished roll)
  favorReady: boolean; // ready to move past favor phase
  pendingFavors: string[]; // list of god favor ids chosen to cast this round
  rolling: boolean; // true while cup/hand covers bowl
}

export interface GameSnapshot {
  phase: Phase;
  round: number;
  turn: PlayerSide; // who rolls first this round
  rollTurn: PlayerSide; // whose roll/lock action is active during the roll phase
  host: PlayerState;
  guest: PlayerState;
  log: string[]; // resolution log
  winner?: PlayerSide | null;
  rematchRequest?: PlayerSide | null;
}

export interface GodFavor {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  cost: number;
  // A short icon glyph (lucide or text) representing the god
  icon: string;
  // Priority during resolve — lower = earlier
  priority: number;
}

// Curated set of 6 god favors (Valhalla-style simplified, one tier each)
export const GOD_FAVORS: GodFavor[] = [
  {
    id: 'baldr',
    name: "Baldr's Invulnerability",
    subtitle: 'The Shining One',
    description: '+1 block for each helmet/shield you rolled.',
    cost: 3,
    icon: 'ᛒ',
    priority: 10,
  },
  {
    id: 'skadi',
    name: "Skadi's Hunt",
    subtitle: 'Huntress of the Frost',
    description: '+1 arrow damage for each arrow you rolled.',
    cost: 5,
    icon: 'ᛋ',
    priority: 11,
  },
  {
    id: 'vidar',
    name: "Vidar's Might",
    subtitle: 'Silent Son of Odin',
    description: "Remove 3 of the opponent's helmets/shields.",
    cost: 4,
    icon: 'ᚢ',
    priority: 20,
  },
  {
    id: 'thor',
    name: "Thor's Strike",
    subtitle: 'Thunder of Asgard',
    description: 'Deal 3 bonus damage after resolution (ignores blocks).',
    cost: 5,
    icon: 'ᚦ',
    priority: 40,
  },
  {
    id: 'idun',
    name: "Idun's Rejuvenation",
    subtitle: 'Keeper of Apples',
    description: 'Heal 4 health after resolution.',
    cost: 4,
    icon: 'ᛁ',
    priority: 50,
  },
  {
    id: 'mimir',
    name: "Mimir's Wisdom",
    subtitle: 'Severed Seer',
    description: 'Gain 2 favor ⌘ per damage taken this round.',
    cost: 3,
    icon: 'ᛗ',
    priority: 60,
  },
];

export const GOD_FAVOR_MAP: Record<string, GodFavor> = Object.fromEntries(
  GOD_FAVORS.map((g) => [g.id, g]),
);

// Network message types for Supabase broadcast
export type NetMsg =
  | { type: 'hello'; side: PlayerSide; name: string }
  | { type: 'seed'; seed: string; kind: 'roll' | 'reroll'; round: number }
  | { type: 'state'; snapshot: GameSnapshot } // host authoritative state
  | { type: 'action'; side: PlayerSide; action: PlayerAction }
  | { type: 'rematch'; side: PlayerSide }
  | { type: 'ping'; t: number };

export type PlayerAction =
  | { kind: 'set_name'; name: string }
  | { kind: 'toggle_keep'; dieId: number }
  | { kind: 'reroll' }
  | { kind: 'stand' } // done rolling (skip remaining rerolls)
  | { kind: 'cast_favor'; favorId: string }
  | { kind: 'skip_favors' }
  | { kind: 'rematch_request' };
