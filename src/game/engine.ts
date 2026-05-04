import { createRNG } from './rng';
import type {
  Die,
  DieFace,
  GameSnapshot,
  PlayerSide,
  PlayerState,
} from './types';
import { DIE_FACE_ORDER, GOD_FAVOR_MAP } from './types';

export const MAX_HP = 15;
export const DICE_COUNT = 6;
export const MAX_REROLLS = 2;

export function freshPlayer(name: string): PlayerState {
  return {
    name,
    hp: MAX_HP,
    favor: 0,
    dice: Array.from({ length: DICE_COUNT }, (_, i) => ({
      id: i,
      face: 'axe' as DieFace,
      kept: false,
    })),
    rollsLeft: MAX_REROLLS,
    ready: false,
    favorReady: false,
    pendingFavors: [],
    rolling: false,
  };
}

export function freshSnapshot(hostName = 'Host', guestName = 'Guest'): GameSnapshot {
  return {
    phase: 'roll',
    round: 1,
    turn: 'host',
    host: freshPlayer(hostName),
    guest: freshPlayer(guestName),
    log: ['The game begins. May the Norns favor you.'],
    winner: null,
    rematchRequest: null,
  };
}

// Deterministic roll of 6 dice from a seed string — used across host & guest
export function rollSix(seed: string, prefix: string): DieFace[] {
  const rng = createRNG(`${seed}:${prefix}`);
  return Array.from({ length: DICE_COUNT }, () => {
    const idx = Math.floor(rng() * DIE_FACE_ORDER.length);
    return DIE_FACE_ORDER[idx];
  });
}

// Roll (or reroll unkept) dice in place for a player
export function applyRollForPlayer(player: PlayerState, faces: DieFace[], initial: boolean): void {
  for (let i = 0; i < DICE_COUNT; i++) {
    if (initial || !player.dice[i].kept) {
      player.dice[i].face = faces[i];
    }
  }
  if (initial) {
    // First roll of the round -> everything unkept
    player.dice.forEach((d) => (d.kept = false));
  }
}

export function opposite(side: PlayerSide): PlayerSide {
  return side === 'host' ? 'guest' : 'host';
}

// Resolution phase: apply god favors + dice faces to produce damage / effects
export interface ResolveReport {
  log: string[];
  host: { damageTaken: number; healed: number; favorGained: number; favorLost: number };
  guest: { damageTaken: number; healed: number; favorGained: number; favorLost: number };
}

// Pre-resolution dice counts (post favor buffs applied)
interface DiceCounts {
  axe: number;
  arrow: number;
  helmet: number;
  shield: number;
  steal: number;
  earn: number;
}

function countFaces(dice: Die[]): DiceCounts {
  const c: DiceCounts = { axe: 0, arrow: 0, helmet: 0, shield: 0, steal: 0, earn: 0 };
  dice.forEach((d) => (c[d.face] += 1));
  return c;
}

export function resolveRound(snap: GameSnapshot): ResolveReport {
  const log: string[] = [];
  const { host, guest } = snap;

  const hostCounts = countFaces(host.dice);
  const guestCounts = countFaces(guest.dice);

  // 1) Favor gain/steal from raw dice first (earn + steal)
  const hostFavorFromDice = hostCounts.earn + hostCounts.steal;
  const guestFavorFromDice = guestCounts.earn + guestCounts.steal;
  const hostStolen = Math.min(hostCounts.steal, Math.max(0, guest.favor));
  const guestStolen = Math.min(guestCounts.steal, Math.max(0, host.favor));
  host.favor = Math.max(0, host.favor - guestStolen) + hostCounts.earn + hostStolen;
  guest.favor = Math.max(0, guest.favor - hostStolen) + guestCounts.earn + guestStolen;
  if (hostFavorFromDice > 0) log.push(`${host.name} gained ${hostCounts.earn}⌘ and stole ${hostStolen}⌘.`);
  if (guestFavorFromDice > 0) log.push(`${guest.name} gained ${guestCounts.earn}⌘ and stole ${guestStolen}⌘.`);

  // Spend favor for chosen favors (deduct now; they've already been gained in previous rounds)
  const hostFavors = host.pendingFavors.filter((id) => GOD_FAVOR_MAP[id]);
  const guestFavors = guest.pendingFavors.filter((id) => GOD_FAVOR_MAP[id]);

  // Sort by priority (lower first)
  hostFavors.sort((a, b) => GOD_FAVOR_MAP[a].priority - GOD_FAVOR_MAP[b].priority);
  guestFavors.sort((a, b) => GOD_FAVOR_MAP[a].priority - GOD_FAVOR_MAP[b].priority);

  // Spend cost
  hostFavors.forEach((id) => {
    host.favor = Math.max(0, host.favor - GOD_FAVOR_MAP[id].cost);
  });
  guestFavors.forEach((id) => {
    guest.favor = Math.max(0, guest.favor - GOD_FAVOR_MAP[id].cost);
  });

  // 2) Favor effects that modify dice counts (Baldr, Skadi)
  if (hostFavors.includes('baldr')) {
    const bonus = hostCounts.helmet + hostCounts.shield;
    hostCounts.helmet += Math.ceil(bonus / 2);
    hostCounts.shield += Math.floor(bonus / 2);
    log.push(`${host.name} invokes Baldr — +${bonus} blocks.`);
  }
  if (guestFavors.includes('baldr')) {
    const bonus = guestCounts.helmet + guestCounts.shield;
    guestCounts.helmet += Math.ceil(bonus / 2);
    guestCounts.shield += Math.floor(bonus / 2);
    log.push(`${guest.name} invokes Baldr — +${bonus} blocks.`);
  }
  if (hostFavors.includes('skadi')) {
    hostCounts.arrow += hostCounts.arrow;
    log.push(`${host.name} invokes Skadi — arrows doubled.`);
  }
  if (guestFavors.includes('skadi')) {
    guestCounts.arrow += guestCounts.arrow;
    log.push(`${guest.name} invokes Skadi — arrows doubled.`);
  }

  // 3) Vidar removes opponent blocks
  if (hostFavors.includes('vidar')) {
    const before = guestCounts.helmet + guestCounts.shield;
    let rem = 3;
    const cutH = Math.min(guestCounts.helmet, rem);
    guestCounts.helmet -= cutH;
    rem -= cutH;
    const cutS = Math.min(guestCounts.shield, rem);
    guestCounts.shield -= cutS;
    log.push(`${host.name} invokes Vidar — shatters ${Math.min(3, before)} blocks.`);
  }
  if (guestFavors.includes('vidar')) {
    const before = hostCounts.helmet + hostCounts.shield;
    let rem = 3;
    const cutH = Math.min(hostCounts.helmet, rem);
    hostCounts.helmet -= cutH;
    rem -= cutH;
    const cutS = Math.min(hostCounts.shield, rem);
    hostCounts.shield -= cutS;
    log.push(`${guest.name} invokes Vidar — shatters ${Math.min(3, before)} blocks.`);
  }

  // 4) Compute damage: axes vs helmets, arrows vs shields
  const hostDmg = Math.max(0, hostCounts.axe - guest.dice.length * 0) // placeholder; uses counts below
    ;
  // Real calc
  const hostAxeDmg = Math.max(0, hostCounts.axe - guestCounts.helmet);
  const hostArrowDmg = Math.max(0, hostCounts.arrow - guestCounts.shield);
  const guestAxeDmg = Math.max(0, guestCounts.axe - hostCounts.helmet);
  const guestArrowDmg = Math.max(0, guestCounts.arrow - hostCounts.shield);
  void hostDmg;

  let hostDamageTaken = guestAxeDmg + guestArrowDmg;
  let guestDamageTaken = hostAxeDmg + hostArrowDmg;

  // 5) Thor's strike bonus (ignores blocks)
  if (hostFavors.includes('thor')) {
    guestDamageTaken += 3;
    log.push(`${host.name} invokes Thor — +3 unblockable damage.`);
  }
  if (guestFavors.includes('thor')) {
    hostDamageTaken += 3;
    log.push(`${guest.name} invokes Thor — +3 unblockable damage.`);
  }

  // Apply damage
  host.hp = Math.max(0, host.hp - hostDamageTaken);
  guest.hp = Math.max(0, guest.hp - guestDamageTaken);
  if (hostDamageTaken > 0) log.push(`${host.name} takes ${hostDamageTaken} damage.`);
  if (guestDamageTaken > 0) log.push(`${guest.name} takes ${guestDamageTaken} damage.`);

  // 6) Post-resolution heal (Idun) and favor gain (Mimir)
  let hostHealed = 0;
  let guestHealed = 0;
  if (hostFavors.includes('idun')) {
    const heal = Math.min(4, MAX_HP - host.hp);
    host.hp += heal;
    hostHealed += heal;
    log.push(`${host.name} invokes Idun — heals ${heal}.`);
  }
  if (guestFavors.includes('idun')) {
    const heal = Math.min(4, MAX_HP - guest.hp);
    guest.hp += heal;
    guestHealed += heal;
    log.push(`${guest.name} invokes Idun — heals ${heal}.`);
  }
  let hostFavorGained = hostCounts.earn + hostStolen;
  let guestFavorGained = guestCounts.earn + guestStolen;
  if (hostFavors.includes('mimir')) {
    const gain = hostDamageTaken * 2;
    host.favor += gain;
    hostFavorGained += gain;
    if (gain > 0) log.push(`${host.name} invokes Mimir — gains ${gain}⌘.`);
  }
  if (guestFavors.includes('mimir')) {
    const gain = guestDamageTaken * 2;
    guest.favor += gain;
    guestFavorGained += gain;
    if (gain > 0) log.push(`${guest.name} invokes Mimir — gains ${gain}⌘.`);
  }

  // Reset pending favors
  host.pendingFavors = [];
  guest.pendingFavors = [];

  return {
    log,
    host: {
      damageTaken: hostDamageTaken,
      healed: hostHealed,
      favorGained: hostFavorGained,
      favorLost: guestStolen,
    },
    guest: {
      damageTaken: guestDamageTaken,
      healed: guestHealed,
      favorGained: guestFavorGained,
      favorLost: hostStolen,
    },
  };
}

// Prepare players for next round (reset dice kept state, rolls left, readiness)
export function beginNextRound(snap: GameSnapshot): void {
  snap.round += 1;
  snap.turn = snap.turn === 'host' ? 'guest' : 'host';
  [snap.host, snap.guest].forEach((p) => {
    p.rollsLeft = MAX_REROLLS;
    p.ready = false;
    p.favorReady = false;
    p.rolling = false;
    p.dice.forEach((d) => (d.kept = false));
  });
  snap.phase = 'roll';
}

export function winner(snap: GameSnapshot): PlayerSide | null {
  if (snap.host.hp <= 0 && snap.guest.hp <= 0) return snap.host.hp > snap.guest.hp ? 'host' : 'guest';
  if (snap.host.hp <= 0) return 'guest';
  if (snap.guest.hp <= 0) return 'host';
  return null;
}
