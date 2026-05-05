import { createRNG } from './rng';
import type {
  Die,
  DieFace,
  DieRoll,
  GameSnapshot,
  GodFavor,
  PlayerSide,
  PlayerState,
  ResolutionStep,
} from './types';
import { AI_FAVOR_LOADOUT, DEFAULT_FAVOR_LOADOUT, GOD_FAVOR_MAP, PHYSICAL_DICE, sanitizeFavorLoadout } from './types';

export const MAX_HP = 15;
export const DICE_COUNT = 6;
export const MAX_ROLLS = 3;
export const MAX_REROLLS = MAX_ROLLS - 1;

export function freshPlayer(name: string): PlayerState {
  return {
    name,
    hp: MAX_HP,
    favor: 0,
    availableFavors: [...DEFAULT_FAVOR_LOADOUT],
    favorLoadoutLocked: false,
    dice: Array.from({ length: DICE_COUNT }, (_, i) => ({
      id: i,
      face: 'axe' as DieFace,
      grantsFavor: false,
      kept: false,
      selected: false,
    })),
    rollsLeft: MAX_ROLLS,
    turnRolled: false,
    ready: false,
    favorReady: false,
    pendingFavors: [],
    rolling: false,
  };
}

export function freshSnapshot(
  hostName = 'Host',
  guestName = 'Guest',
  hostFavors = DEFAULT_FAVOR_LOADOUT,
  guestFavors = DEFAULT_FAVOR_LOADOUT,
): GameSnapshot {
  const host = freshPlayer(hostName);
  host.availableFavors = sanitizeFavorLoadout(hostFavors);
  host.favorLoadoutLocked = true;
  const guest = freshPlayer(guestName);
  guest.availableFavors = sanitizeFavorLoadout(guestFavors);
  guest.favorLoadoutLocked = true;
  return {
    phase: 'roll',
    round: 1,
    turn: 'host',
    rollTurn: 'host',
    host,
    guest,
    log: ['The game begins. May the Norns favor you.'],
    resolutionStep: null,
    winner: null,
    endReason: null,
    rematchRequest: null,
  };
}

export function freshSoloSnapshot(hostName = 'Host', guestName = 'Guest', hostFavors = DEFAULT_FAVOR_LOADOUT): GameSnapshot {
  return freshSnapshot(hostName, guestName, hostFavors, AI_FAVOR_LOADOUT);
}

// Deterministic roll of 6 dice from a seed string — used across host & guest
export function rollSix(seed: string, prefix: string): DieRoll[] {
  const rng = createRNG(`${seed}:${prefix}`);
  return Array.from({ length: DICE_COUNT }, (_, dieIndex) => {
    const sides = PHYSICAL_DICE[dieIndex];
    const side = sides[Math.floor(rng() * sides.length)];
    return { ...side };
  });
}

// Roll (or reroll unkept) dice in place for a player
export function applyRollForPlayer(player: PlayerState, rolls: DieRoll[], initial: boolean): void {
  for (let i = 0; i < DICE_COUNT; i++) {
    if (initial || !player.dice[i].kept) {
      player.dice[i].face = rolls[i].face;
      player.dice[i].grantsFavor = rolls[i].grantsFavor;
      player.dice[i].selected = false;
    }
  }
  if (initial) {
    // First roll of the round -> everything unkept
    player.dice.forEach((d) => {
      d.kept = false;
      d.selected = false;
    });
  }
}

export function opposite(side: PlayerSide): PlayerSide {
  return side === 'host' ? 'guest' : 'host';
}

interface DiceCounts {
  axe: number;
  arrow: number;
  helmet: number;
  shield: number;
  steal: number;
}

function countFaces(dice: Die[]): DiceCounts {
  const c: DiceCounts = { axe: 0, arrow: 0, helmet: 0, shield: 0, steal: 0 };
  dice.forEach((d) => (c[d.face] += 1));
  return c;
}

function countFavorBorders(dice: Die[]): number {
  return dice.filter((d) => d.grantsFavor).length;
}

function sideName(snap: GameSnapshot, side: PlayerSide): string {
  return snap[side].name || (side === 'host' ? 'Host' : 'Guest');
}

function selectedGods(snap: GameSnapshot): { side: PlayerSide; god: GodFavor }[] {
  const picks: { side: PlayerSide; god: GodFavor }[] = [];
  (['host', 'guest'] as PlayerSide[]).forEach((side) => {
    snap[side].pendingFavors.forEach((id) => {
      if (!snap[side].availableFavors.includes(id)) return;
      const god = GOD_FAVOR_MAP[id];
      if (god && snap[side].favor >= god.cost) picks.push({ side, god });
    });
  });
  return picks.sort((a, b) => a.god.priority - b.god.priority);
}

function reduceCount(counts: DiceCounts, face: keyof DiceCounts, amount: number): number {
  const removed = Math.min(counts[face], Math.max(0, amount));
  counts[face] -= removed;
  return removed;
}

function majorityFace(counts: DiceCounts): keyof DiceCounts {
  const faces: (keyof DiceCounts)[] = ['axe', 'arrow', 'helmet', 'shield', 'steal'];
  return faces.sort((a, b) => counts[b] - counts[a])[0];
}

function banStrongestDie(counts: DiceCounts): keyof DiceCounts {
  const threatOrder: (keyof DiceCounts)[] = ['axe', 'arrow', 'steal', 'helmet', 'shield'];
  return threatOrder.find((face) => counts[face] > 0) || 'shield';
}

function godStep(
  id: number,
  snap: GameSnapshot,
  actor: PlayerSide,
  god: GodFavor,
  text: string,
  deltas: Partial<Pick<Extract<ResolutionStep, { kind: 'god' }>, 'actorHpDelta' | 'targetHpDelta' | 'actorFavorDelta' | 'targetFavorDelta'>> = {},
): Extract<ResolutionStep, { kind: 'god' }> {
  return {
    id,
    kind: 'god',
    actor,
    target: opposite(actor),
    favorId: god.id,
    cost: god.cost,
    actorHpDelta: deltas.actorHpDelta || 0,
    targetHpDelta: deltas.targetHpDelta || 0,
    actorFavorDelta: deltas.actorFavorDelta || 0,
    targetFavorDelta: deltas.targetFavorDelta || 0,
    text: `${sideName(snap, actor)} invokes ${god.name}: ${text}`,
  };
}

export function buildResolutionSteps(snap: GameSnapshot): ResolutionStep[] {
  const steps: ResolutionStep[] = [];
  let id = 1;
  const counts: Record<PlayerSide, DiceCounts> = {
    host: countFaces(snap.host.dice),
    guest: countFaces(snap.guest.dice),
  };
  const favor = {
    host: countFavorBorders(snap.host.dice),
    guest: countFavorBorders(snap.guest.dice),
  };
  if (favor.host > 0 || favor.guest > 0) {
    steps.push({
      id: id++,
      kind: 'favor',
      hostFavor: favor.host,
      guestFavor: favor.guest,
      text: `${sideName(snap, 'host')} gains ${favor.host} favor; ${sideName(snap, 'guest')} gains ${favor.guest} favor.`,
    });
  }

  const second = opposite(snap.turn);
  const order: PlayerSide[] = [second, snap.turn];
  const attackStats: Record<PlayerSide, { dealt: number; taken: number; blocked: number; axeDamage: number }> = {
    host: { dealt: 0, taken: 0, blocked: 0, axeDamage: 0 },
    guest: { dealt: 0, taken: 0, blocked: 0, axeDamage: 0 },
  };

  selectedGods(snap).forEach(({ side, god }) => {
    if (god.priority >= 40) return;
    const target = opposite(side);
    switch (god.id) {
      case 'baldr': {
        const helmets = counts[side].helmet;
        const shields = counts[side].shield;
        counts[side].helmet += helmets;
        counts[side].shield += shields;
        steps.push(godStep(id++, snap, side, god, `adds ${helmets} helmet and ${shields} shield block.`));
        break;
      }
      case 'skadi': {
        const arrows = counts[side].arrow;
        counts[side].arrow += arrows;
        steps.push(godStep(id++, snap, side, god, `adds ${arrows} arrow${arrows === 1 ? '' : 's'}.`));
        break;
      }
      case 'vidar': {
        const removed = reduceCount(counts[target], 'helmet', 2);
        steps.push(godStep(id++, snap, side, god, `removes ${removed} helmet${removed === 1 ? '' : 's'} from ${sideName(snap, target)}.`));
        break;
      }
      case 'ullr': {
        const ignored = reduceCount(counts[target], 'shield', Math.min(2, counts[side].arrow));
        steps.push(godStep(id++, snap, side, god, `${ignored} arrow${ignored === 1 ? '' : 's'} ignore shields.`));
        break;
      }
      case 'brunhild': {
        const added = Math.ceil(counts[side].axe * 0.5);
        counts[side].axe += added;
        steps.push(godStep(id++, snap, side, god, `adds ${added} axe${added === 1 ? '' : 's'} through fury.`));
        break;
      }
      case 'freyr': {
        const face = majorityFace(counts[side]);
        counts[side][face] += 2;
        steps.push(godStep(id++, snap, side, god, `adds 2 to ${face}.`));
        break;
      }
      case 'loki': {
        const face = banStrongestDie(counts[target]);
        const banned = reduceCount(counts[target], face, 1);
        steps.push(godStep(id++, snap, side, god, `bans ${banned} ${face} from ${sideName(snap, target)}.`));
        break;
      }
      default:
        break;
    }
  });

  order.forEach((side) => {
    ([
      ['axe', 'helmet'],
      ['arrow', 'shield'],
    ] as const).forEach(([attackFace, blockFace]) => {
      const target = opposite(side);
      const attack = counts[side][attackFace];
      if (attack <= 0) return;
      const blocked = Math.min(attack, counts[target][blockFace]);
      const damage = attack - blocked;
      counts[target][blockFace] -= blocked;
      attackStats[side].dealt += damage;
      attackStats[target].blocked += blocked;
      attackStats[target].taken += damage;
      if (attackFace === 'axe') attackStats[side].axeDamage += damage;
      steps.push({
        id: id++,
        kind: 'attack',
        actor: side,
        target,
        attackFace,
        blockFace,
        attack,
        blocked,
        damage,
        text: `${sideName(snap, side)} uses ${attack} ${attackFace}${attack === 1 ? '' : 's'}; ${blocked} blocked, ${sideName(snap, target)} takes ${damage} damage.`,
      });
    });
  });

  selectedGods(snap).forEach(({ side, god }) => {
    if (god.priority < 40) return;
    const target = opposite(side);
    switch (god.id) {
      case 'thor':
        steps.push(godStep(id++, snap, side, god, `deals 2 unblockable damage to ${sideName(snap, target)}.`, { targetHpDelta: -2 }));
        break;
      case 'heimdall': {
        const healed = attackStats[side].blocked;
        steps.push(godStep(id++, snap, side, god, `heals ${healed} health from blocked attacks.`, { actorHpDelta: healed }));
        break;
      }
      case 'hel': {
        const healed = attackStats[side].axeDamage;
        steps.push(godStep(id++, snap, side, god, `heals ${healed} health from axe damage.`, { actorHpDelta: healed }));
        break;
      }
      case 'idun':
        steps.push(godStep(id++, snap, side, god, 'heals 2 health.', { actorHpDelta: 2 }));
        break;
      case 'skuld': {
        const destroyed = counts[side].arrow * 2;
        steps.push(godStep(id++, snap, side, god, `destroys up to ${destroyed} favor from ${sideName(snap, target)}.`, { targetFavorDelta: -destroyed }));
        break;
      }
      case 'mimir': {
        const gained = attackStats[side].taken;
        steps.push(godStep(id++, snap, side, god, `gains ${gained} favor from damage taken.`, { actorFavorDelta: gained }));
        break;
      }
      default:
        break;
    }
  });

  order.forEach((side) => {
    const target = opposite(side);
    const steal = counts[side].steal;
    if (steal <= 0) return;
    steps.push({
      id: id++,
      kind: 'steal',
      actor: side,
      target,
      steal,
      stolen: 0,
      text: `${sideName(snap, side)} reaches for ${steal} favor token${steal === 1 ? '' : 's'}.`,
    });
  });

  return steps;
}

export function applyResolutionStep(snap: GameSnapshot, step: ResolutionStep): ResolutionStep {
  if (step.kind === 'favor') {
    snap.host.favor += step.hostFavor;
    snap.guest.favor += step.guestFavor;
    return step;
  }
  if (step.kind === 'attack') {
    snap[step.target].hp = Math.max(0, snap[step.target].hp - step.damage);
    return step;
  }
  if (step.kind === 'god') {
    const actor = snap[step.actor];
    const target = snap[step.target];
    actor.favor = Math.max(0, actor.favor - step.cost + step.actorFavorDelta);
    target.favor = Math.max(0, target.favor + step.targetFavorDelta);
    actor.hp = Math.max(0, Math.min(MAX_HP, actor.hp + step.actorHpDelta));
    target.hp = Math.max(0, Math.min(MAX_HP, target.hp + step.targetHpDelta));
    return step;
  }

  const stolen = Math.min(step.steal, snap[step.target].favor);
  snap[step.target].favor -= stolen;
  snap[step.actor].favor += stolen;
  return {
    ...step,
    stolen,
    text: `${sideName(snap, step.actor)} steals ${stolen} favor from ${sideName(snap, step.target)}.`,
  };
}

// Prepare players for next round (reset dice kept state, rolls left, readiness)
export function beginNextRound(snap: GameSnapshot): void {
  snap.round += 1;
  snap.turn = snap.turn === 'host' ? 'guest' : 'host';
  snap.rollTurn = snap.turn;
  [snap.host, snap.guest].forEach((p) => {
    p.rollsLeft = MAX_ROLLS;
    p.turnRolled = false;
    p.ready = false;
    p.favorReady = false;
    p.rolling = false;
    p.dice.forEach((d) => {
      d.face = 'axe';
      d.kept = false;
      d.selected = false;
      d.grantsFavor = false;
    });
  });
  snap.phase = 'roll';
  snap.resolutionStep = null;
}

export function winner(snap: GameSnapshot): PlayerSide | null {
  if (snap.host.hp <= 0 && snap.guest.hp <= 0) return snap.host.hp > snap.guest.hp ? 'host' : 'guest';
  if (snap.host.hp <= 0) return 'guest';
  if (snap.guest.hp <= 0) return 'host';
  return null;
}
