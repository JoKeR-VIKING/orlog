// Orlog AI opponent for single-player mode.
// Three difficulty levels:
//   skald     — novice: mostly random keeps, rarely casts favors
//   vikingr   — intermediate: reasonable heuristics, sometimes errs
//   berserkr  — expert: aggressive strategy + optimal favor usage

import type {
  DieFace,
  GameSnapshot,
  GodFavor,
  PlayerAction,
  PlayerSide,
  PlayerState,
} from '../game/types';
import { GOD_FAVORS, GOD_FAVOR_MAP, sanitizeFavorLoadout } from '../game/types';

export type Difficulty = 'skald' | 'vikingr' | 'berserkr';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  skald: 'Skald',
  vikingr: 'Vikingr',
  berserkr: 'Berserkr',
};

export const DIFFICULTY_SUBTITLE: Record<Difficulty, string> = {
  skald: 'Novice poet — learned the rules but fumbles the bones',
  vikingr: 'Seasoned warrior — thinks, plans, sometimes slips',
  berserkr: 'Frenzied master — reads the Norns and strikes true',
};

type Strategy = 'offense' | 'defense' | 'favor' | 'disrupt';

function countFaces(dice: PlayerState['dice']): Record<DieFace, number> {
  const c: Record<DieFace, number> = {
    axe: 0, arrow: 0, helmet: 0, shield: 0, steal: 0,
  };
  dice.forEach((d) => (c[d.face] += 1));
  return c;
}

function committedDice(player: PlayerState): PlayerState['dice'] {
  return player.dice.filter((d) => d.kept || d.selected);
}

function chooseStrategy(
  me: PlayerState,
  opp: PlayerState,
  myCommitted: Record<DieFace, number>,
  oppCommitted: Record<DieFace, number>,
  diff: Difficulty,
): Strategy {
  const incoming = Math.max(0, oppCommitted.axe - myCommitted.helmet) + Math.max(0, oppCommitted.arrow - myCommitted.shield);
  const pressure = me.hp <= 6 || incoming >= 3;
  const canThreatenFavor = opp.favor >= 4;
  const behindOnFavor = me.favor + committedDice(me).filter((d) => d.grantsFavor).length < 4;
  const lethalReach = opp.hp <= myCommitted.axe + myCommitted.arrow + 3;

  if (diff === 'skald') {
    if (pressure && Math.random() < 0.45) return 'defense';
    if (behindOnFavor && Math.random() < 0.35) return 'favor';
    if (canThreatenFavor && Math.random() < 0.25) return 'disrupt';
    return Math.random() < 0.6 ? 'offense' : 'favor';
  }

  if (diff === 'vikingr') {
    const good = lethalReach ? 'offense' : pressure ? 'defense' : canThreatenFavor ? 'disrupt' : behindOnFavor ? 'favor' : 'offense';
    if (Math.random() < 0.18) {
      const alternatives = (['offense', 'defense', 'favor', 'disrupt'] as Strategy[]).filter((s) => s !== good);
      return alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    return good;
  }

  if (lethalReach) return 'offense';
  if (pressure) return 'defense';
  if (canThreatenFavor) return 'disrupt';
  if (behindOnFavor) return 'favor';
  return 'offense';
}

function dieValue(
  die: PlayerState['dice'][number],
  me: PlayerState,
  opp: PlayerState,
  myCommitted: Record<DieFace, number>,
  oppCommitted: Record<DieFace, number>,
  strategy: Strategy,
  diff: Difficulty,
): number {
  const lowHp = me.hp <= 6;
  const winning = me.hp - opp.hp >= 3;
  const exactCounters = diff !== 'skald';
  let value = die.grantsFavor ? (strategy === 'favor' ? 2.5 : me.favor < 6 ? 1.25 : 0.5) : 0;

  switch (die.face) {
    case 'axe':
      value += 3.5 + (strategy === 'offense' ? 2.5 : 0) + (oppCommitted.helmet === 0 ? 2.25 : -0.6 * oppCommitted.helmet) + (myCommitted.axe > 0 ? 1 : 0) + (winning ? 0.75 : 0);
      break;
    case 'arrow':
      value += 3.5 + (strategy === 'offense' ? 2.5 : 0) + (oppCommitted.shield === 0 ? 2.25 : -0.6 * oppCommitted.shield) + (myCommitted.arrow > 0 ? 1 : 0) + (winning ? 0.75 : 0);
      break;
    case 'helmet':
      value += 2.75 + (strategy === 'defense' ? 2.5 : 0) + (exactCounters ? Math.min(oppCommitted.axe, 3) * 2.15 : Math.min(oppCommitted.axe, 2)) + (lowHp ? 1.5 : 0);
      break;
    case 'shield':
      value += 2.75 + (strategy === 'defense' ? 2.5 : 0) + (exactCounters ? Math.min(oppCommitted.arrow, 3) * 2.15 : Math.min(oppCommitted.arrow, 2)) + (lowHp ? 1.5 : 0);
      break;
    case 'steal':
      value += (strategy === 'disrupt' ? 4 : 0) + (opp.favor >= 5 ? 5.5 : opp.favor >= 3 ? 4.5 : opp.favor > 0 ? 3 : 1.5);
      break;
  }
  return value;
}

function desiredKeepIds(
  snap: GameSnapshot,
  side: PlayerSide,
  diff: Difficulty,
): number[] {
  const me = snap[side];
  const opp = snap[side === 'host' ? 'guest' : 'host'];
  const myCommitted = countFaces(committedDice(me));
  const oppCommitted = countFaces(committedDice(opp));
  const strategy = chooseStrategy(me, opp, myCommitted, oppCommitted, diff);

  const scores = me.dice.map((d) => ({
    id: d.id,
    face: d.face,
    score: dieValue(d, me, opp, myCommitted, oppCommitted, strategy, diff),
    kept: d.kept,
  }));

  if (diff === 'skald') {
    return scores
      .filter((s) => s.kept || s.score >= 7 || Math.random() < 0.32)
      .map((s) => s.id);
  }

  if (diff === 'vikingr') {
    const threshold = me.rollsLeft <= 1 ? 4.2 : 5.1;
    return scores
      .filter((s) => s.kept || (s.score >= threshold && Math.random() > 0.14))
      .map((s) => s.id);
  }

  const threshold = me.rollsLeft <= 1 ? 3.8 : 5;
  const keepIds = scores
    .filter((s) => s.kept || s.score >= threshold)
    .map((s) => s.id);
  if (me.rollsLeft > 1 && keepIds.filter((id) => !me.dice[id].kept).length >= 5) {
    return scores
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.id);
  }
  return keepIds;
}

// Decide which dice to KEEP (set kept=true) given the current roll and state.
// Returns array of die ids to toggle TO KEPT (assumes current all-unkept on fresh roll;
// we diff against existing kept state).
export function aiPickKeeps(
  snap: GameSnapshot,
  side: PlayerSide,
  diff: Difficulty,
): number[] {
  const me = snap[side];
  return diffKeeps(me, desiredKeepIds(snap, side, diff));
}

// Return die ids whose kept flag needs to be toggled to match desired keepIds set.
function diffKeeps(me: PlayerState, desiredKeep: number[]): number[] {
  const desired = new Set(desiredKeep);
  const toggles: number[] = [];
  me.dice.forEach((d) => {
    if (d.kept) return;
    const want = desired.has(d.id);
    if (want !== d.selected) toggles.push(d.id);
  });
  return toggles;
}

// Decide whether to stand (lock) or reroll. Returns 'stand' or 'reroll'.
export function aiRollDecision(
  snap: GameSnapshot,
  side: PlayerSide,
  diff: Difficulty,
): 'stand' | 'reroll' {
  const me = snap[side];
  if (me.rollsLeft <= 0) return 'stand';
  // If every die is kept, we cannot reroll anyway
  if (me.dice.every((d) => d.kept)) return 'stand';

  const opp = snap[side === 'host' ? 'guest' : 'host'];
  const myCommitted = countFaces(committedDice(me));
  const oppCommitted = countFaces(committedDice(opp));
  const strategy = chooseStrategy(me, opp, myCommitted, oppCommitted, diff);
  const scores = me.dice.map((d) => dieValue(d, me, opp, myCommitted, oppCommitted, strategy, diff));
  const rerollableLow = scores.filter((s, i) => !me.dice[i].kept && !me.dice[i].selected && s <= 3.75).length;
  const selectedNow = me.dice.filter((d) => d.kept || d.selected).length;

  if (diff === 'skald') {
    if (me.rollsLeft <= 1) return 'stand';
    if (rerollableLow >= 2) return Math.random() < 0.7 ? 'reroll' : 'stand';
    return Math.random() < 0.4 ? 'reroll' : 'stand';
  }
  if (diff === 'vikingr') {
    if (me.rollsLeft <= 1) return 'stand';
    if (selectedNow >= 5) return Math.random() < 0.85 ? 'stand' : 'reroll';
    if (rerollableLow >= 2 && Math.random() > 0.15) return 'reroll';
    return 'stand';
  }

  if (me.rollsLeft <= 1) return 'stand';
  if (selectedNow >= 5) return 'stand';
  if (rerollableLow >= 1) return 'reroll';
  return 'stand';
}

// Decide favors to cast this round (return list of god ids, in desired order).
export function aiPickFavors(
  snap: GameSnapshot,
  side: PlayerSide,
  diff: Difficulty,
): string[] {
  const me = snap[side];
  const opp = snap[side === 'host' ? 'guest' : 'host'];
  const counts = countFaces(me.dice);
  const oppCounts = countFaces(opp.dice);
  const expectedIncoming = Math.max(0, oppCounts.axe - counts.helmet) + Math.max(0, oppCounts.arrow - counts.shield);
  const expectedOutgoing = Math.max(0, counts.axe - oppCounts.helmet) + Math.max(0, counts.arrow - oppCounts.shield);
  const favorAfterDice = me.favor + me.dice.filter((d) => d.grantsFavor).length + Math.min(counts.steal, opp.favor);
  const oppFavorAfterDice = Math.max(0, opp.favor - counts.steal) + opp.dice.filter((d) => d.grantsFavor).length + Math.min(oppCounts.steal, me.favor);

  // Score each favor's value in the current state
  const candidates: { god: GodFavor; score: number }[] = [];
  const available = new Set(sanitizeFavorLoadout(me.availableFavors));
  GOD_FAVORS.filter((g) => available.has(g.id)).forEach((g) => {
    let s = 0;
    switch (g.id) {
      case 'thor':
        s = expectedOutgoing + (opp.hp <= expectedOutgoing + 2 ? 10 : 0) + (opp.hp <= 6 ? 3 : 0);
        break;
      case 'idun':
        s = me.hp <= 5 ? 6 : me.hp <= 9 && expectedIncoming > 0 ? 4 : expectedIncoming >= 4 ? 3 : 0;
        break;
      case 'baldr':
        s = (counts.helmet + counts.shield) >= 2 && expectedIncoming > 0 ? (counts.helmet + counts.shield) * 1.8 + expectedIncoming : 0;
        break;
      case 'skadi':
        s = counts.arrow >= 2 ? counts.arrow * 2 + Math.max(0, counts.arrow - oppCounts.shield) : 0;
        break;
      case 'vidar':
        s = oppCounts.helmet >= 1 && counts.axe >= 1 ? 4 + Math.min(2, oppCounts.helmet) : 0;
        break;
      case 'mimir':
        s = expectedIncoming >= 2 ? expectedIncoming * 1.2 + (me.hp <= 8 ? 1 : 0) : 0;
        break;
      case 'ullr':
        s = counts.arrow > 0 && oppCounts.shield > 0 ? 3 + Math.min(counts.arrow, oppCounts.shield, 2) * 2 : 0;
        break;
      case 'brunhild':
        s = counts.axe >= 2 ? counts.axe * 1.8 + Math.max(0, counts.axe - oppCounts.helmet) : 0;
        break;
      case 'freyr': {
        const majority = Math.max(counts.axe, counts.arrow, counts.helmet, counts.shield, counts.steal);
        s = majority >= 2 ? 3 + majority : 0;
        break;
      }
      case 'loki':
        s = Math.max(oppCounts.axe, oppCounts.arrow, oppCounts.steal) >= 1 ? 2.5 + expectedIncoming : 0;
        break;
      case 'heimdall':
        s = counts.helmet + counts.shield >= 2 && expectedIncoming > 0 ? 3 + Math.min(expectedIncoming, counts.helmet + counts.shield) : 0;
        break;
      case 'hel':
        s = Math.max(0, counts.axe - oppCounts.helmet) >= 1 && me.hp <= 10 ? 3 + Math.max(0, counts.axe - oppCounts.helmet) : 0;
        break;
      case 'skuld':
        s = counts.arrow >= 1 && opp.favor >= 3 ? 3 + counts.arrow * 1.5 + Math.min(opp.favor, counts.arrow * 2) : 0;
        break;
    }
    if (oppFavorAfterDice >= 5 && g.id !== 'idun') s += 0.5;
    if (favorAfterDice < g.cost) s -= 1;
    candidates.push({ god: g, score: s });
  });

  candidates.sort((a, b) => b.score - a.score);

  const picks: string[] = [];

  const randomness = diff === 'skald' ? 0.7 : diff === 'vikingr' ? 0.18 : 0;

  for (const c of candidates) {
    if (c.score <= 0) continue;
    if (me.favor < c.god.cost) continue;
    if (Math.random() < randomness) continue;
    const threshold = diff === 'skald' ? 6 : diff === 'vikingr' ? 3.5 : 1.5;
    if (c.score < threshold) continue;
    picks.push(c.god.id);
    break;
  }
  return picks;
}

// Helper: compute cost of favor list
export function favorListCost(ids: string[]): number {
  return ids.reduce((acc, id) => acc + (GOD_FAVOR_MAP[id]?.cost || 0), 0);
}

// Random action delays (ms) per difficulty to feel natural
export function aiDelay(diff: Difficulty, kind: 'think' | 'act'): number {
  if (kind === 'think') {
    return diff === 'skald' ? 700 + Math.random() * 800 : diff === 'vikingr' ? 500 + Math.random() * 700 : 350 + Math.random() * 600;
  }
  return 220 + Math.random() * 300;
}

export function generatePlayerActions(
  snap: GameSnapshot,
  side: PlayerSide,
  diff: Difficulty,
): PlayerAction[] {
  const actions: PlayerAction[] = [];

  if (snap.phase === 'roll') {
    const me = snap[side];
    // Avoid doing anything while rolling animation is playing
    if (me.rolling) return actions;
    if (me.ready) return actions;
    if (!me.turnRolled) {
      actions.push({ kind: 'reroll' });
      return actions;
    }

    const decision = aiRollDecision(snap, side, diff);
    const desired = decision === 'stand'
      ? me.dice.map((d) => d.id)
      : desiredKeepIds(snap, side, diff);
    const toggles = diffKeeps(me, desired);
    toggles.forEach((id) => actions.push({ kind: 'toggle_keep', dieId: id }));
    actions.push({ kind: 'stand' });
  } else if (snap.phase === 'favor') {
    const me = snap[side];
    if (me.favorReady) return actions;
    const picks = aiPickFavors(snap, side, diff);
    picks.forEach((id) => actions.push({ kind: 'cast_favor', favorId: id }));
    actions.push({ kind: 'skip_favors' });
  }
  return actions;
}
