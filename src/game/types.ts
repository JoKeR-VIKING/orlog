// Orlog game types
export type DieFace = 'axe' | 'arrow' | 'helmet' | 'shield' | 'steal';

export const DIE_FACE_ORDER: DieFace[] = [
  'axe',
  'arrow',
  'helmet',
  'shield',
  'steal',
];

export interface DieRoll {
  face: DieFace;
  grantsFavor: boolean;
  sideIndex: number;
}

export type PhysicalDie = readonly DieRoll[];

function definePhysicalDie(sides: Omit<DieRoll, 'sideIndex'>[]): PhysicalDie {
  return sides.map((side, sideIndex) => ({ ...side, sideIndex }));
}

export const PHYSICAL_DICE: readonly PhysicalDie[] = [
  definePhysicalDie([
    { face: 'axe', grantsFavor: false },
    { face: 'arrow', grantsFavor: true },
    { face: 'helmet', grantsFavor: false },
    { face: 'shield', grantsFavor: false },
    { face: 'steal', grantsFavor: false },
    { face: 'axe', grantsFavor: false },
  ]),
  definePhysicalDie([
    { face: 'axe', grantsFavor: false },
    { face: 'arrow', grantsFavor: false },
    { face: 'helmet', grantsFavor: false },
    { face: 'shield', grantsFavor: true },
    { face: 'steal', grantsFavor: true },
    { face: 'axe', grantsFavor: false },
  ]),
  definePhysicalDie([
    { face: 'axe', grantsFavor: false },
    { face: 'arrow', grantsFavor: true },
    { face: 'helmet', grantsFavor: true },
    { face: 'shield', grantsFavor: false },
    { face: 'steal', grantsFavor: false },
    { face: 'axe', grantsFavor: false },
  ]),
  definePhysicalDie([
    { face: 'axe', grantsFavor: false },
    { face: 'arrow', grantsFavor: false },
    { face: 'helmet', grantsFavor: true },
    { face: 'shield', grantsFavor: false },
    { face: 'steal', grantsFavor: true },
    { face: 'axe', grantsFavor: false },
  ]),
  definePhysicalDie([
    { face: 'axe', grantsFavor: false },
    { face: 'arrow', grantsFavor: true },
    { face: 'helmet', grantsFavor: false },
    { face: 'shield', grantsFavor: true },
    { face: 'steal', grantsFavor: false },
    { face: 'axe', grantsFavor: false },
  ]),
  definePhysicalDie([
    { face: 'axe', grantsFavor: false },
    { face: 'arrow', grantsFavor: false },
    { face: 'helmet', grantsFavor: true },
    { face: 'shield', grantsFavor: true },
    { face: 'steal', grantsFavor: false },
    { face: 'axe', grantsFavor: false },
  ]),
];

// A single die in a player's pool
export interface Die {
  id: number; // 0..5 within the player's 6 dice
  face: DieFace;
  grantsFavor: boolean; // golden border: earns 1 favor while still using the face logic
  sideIndex: number; // which physical side is currently on top
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
  availableFavors: string[]; // up to three god favors locked for this game
  favorLoadoutLocked: boolean;
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
  resolutionStep?: ResolutionStep | null;
  winner?: PlayerSide | null;
  endReason?: { kind: 'normal' | 'forfeit' | 'fled'; side?: PlayerSide } | null;
  rematchRequest?: PlayerSide | null;
}

export type ResolutionStep =
  | {
      id: number;
      kind: 'favor';
      hostFavor: number;
      guestFavor: number;
      text: string;
    }
  | {
      id: number;
      kind: 'attack';
      actor: PlayerSide;
      target: PlayerSide;
      attackFace: 'axe' | 'arrow';
      blockFace: 'helmet' | 'shield';
      attack: number;
      blocked: number;
      damage: number;
      text: string;
    }
  | {
      id: number;
      kind: 'steal';
      actor: PlayerSide;
      target: PlayerSide;
      steal: number;
      stolen: number;
      text: string;
    }
  | {
      id: number;
      kind: 'god';
      actor: PlayerSide;
      target: PlayerSide;
      favorId: string;
      invoked: boolean;
      cost: number;
      actorHpDelta: number;
      targetHpDelta: number;
      actorFavorDelta: number;
      targetFavorDelta: number;
      text: string;
    };

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

// Curated one-tier set based on Viking dice-battle god favor pieces.
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
    cost: 6,
    icon: 'ᛋ',
    priority: 11,
  },
  {
    id: 'vidar',
    name: "Vidar's Might",
    subtitle: 'Silent Son of Odin',
    description: "Remove 2 of the opponent's helmets.",
    cost: 2,
    icon: 'ᚢ',
    priority: 20,
  },
  {
    id: 'ullr',
    name: "Ullr's Aim",
    subtitle: 'Bow-Lord of the Snow',
    description: 'Up to 2 arrows ignore shields.',
    cost: 2,
    icon: 'ᚨ',
    priority: 21,
  },
  {
    id: 'brunhild',
    name: "Brunhild's Fury",
    subtitle: 'Valkyrie Flame',
    description: 'Multiply your axes by 1.5, rounded up.',
    cost: 6,
    icon: 'ᛉ',
    priority: 22,
  },
  {
    id: 'freyr',
    name: "Freyr's Gift",
    subtitle: 'Lord of Plenty',
    description: 'Add +2 to your majority die face.',
    cost: 4,
    icon: 'ᚠ',
    priority: 23,
  },
  {
    id: 'loki',
    name: "Loki's Trick",
    subtitle: 'The Shape-Changer',
    description: "Ban 1 of the opponent's strongest dice this round.",
    cost: 3,
    icon: 'ᛚ',
    priority: 24,
  },
  {
    id: 'thor',
    name: "Thor's Strike",
    subtitle: 'Thunder of Asgard',
    description: 'Deal 2 bonus damage after resolution (ignores blocks).',
    cost: 4,
    icon: 'ᚦ',
    priority: 40,
  },
  {
    id: 'heimdall',
    name: "Heimdall's Watch",
    subtitle: 'Guardian of Bifrost',
    description: 'Heal 1 health for each attack you block.',
    cost: 4,
    icon: 'ᚺ',
    priority: 45,
  },
  {
    id: 'hel',
    name: "Hel's Grip",
    subtitle: 'Queen Below',
    description: 'Heal 1 health for each axe damage you deal.',
    cost: 6,
    icon: 'ᚼ',
    priority: 46,
  },
  {
    id: 'idun',
    name: "Idun's Rejuvenation",
    subtitle: 'Keeper of Apples',
    description: 'Heal 2 health after resolution.',
    cost: 4,
    icon: 'ᛁ',
    priority: 50,
  },
  {
    id: 'skuld',
    name: "Skuld's Claim",
    subtitle: 'Norn of What Shall Be',
    description: "Destroy 2 of the opponent's favor for each arrow you rolled.",
    cost: 4,
    icon: 'ᛇ',
    priority: 55,
  },
  {
    id: 'mimir',
    name: "Mimir's Wisdom",
    subtitle: 'Severed Seer',
    description: 'Gain 1 favor ⌘ per damage taken this round.',
    cost: 3,
    icon: 'ᛗ',
    priority: 60,
  },
];

export const GOD_FAVOR_MAP: Record<string, GodFavor> = Object.fromEntries(
  GOD_FAVORS.map((g) => [g.id, g]),
);

export const DEFAULT_FAVOR_LOADOUT = ['thor', 'idun', 'vidar'];
export const AI_FAVOR_LOADOUT = ['thor', 'heimdall', 'skuld'];
export const FAVOR_LOADOUT_SIZE = 3;

export function sanitizeFavorLoadout(ids: string[]): string[] {
  return ids
    .filter((id, index) => GOD_FAVOR_MAP[id] && ids.indexOf(id) === index)
    .slice(0, FAVOR_LOADOUT_SIZE);
}

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
  | { kind: 'set_loadout'; favorIds: string[] }
  | { kind: 'toggle_keep'; dieId: number }
  | { kind: 'reroll' }
  | { kind: 'stand' } // done rolling (skip remaining rerolls)
  | { kind: 'cast_favor'; favorId: string }
  | { kind: 'skip_favors' }
  | { kind: 'forfeit' }
  | { kind: 'rematch_request' };
