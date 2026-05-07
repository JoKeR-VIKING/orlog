// Orlog AI opponent for single-player mode.
// Four difficulty levels:
//   skald     — easy: mostly random keeps, rarely casts favors
//   vikingr   — medium: reasonable heuristics, sometimes errs
//   jarl      — hard: strong planning with small mistakes
//   berserkr  — extra hard: aggressive strategy + optimal favor usage

import type {
  DieFace,
  GameSnapshot,
  GodFavor,
  PlayerAction,
  PlayerSide,
  PlayerState,
} from '../game/types';
import { GOD_FAVORS, GOD_FAVOR_MAP, sanitizeFavorLoadout } from '../game/types';

export type Difficulty = 'skald' | 'vikingr' | 'jarl' | 'berserkr';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  skald: 'Skald',
  vikingr: 'Vikingr',
  jarl: 'Jarl',
  berserkr: 'Berserkr',
};

export const DIFFICULTY_SUBTITLE: Record<Difficulty, string> = {
  skald: 'Easy — novice poet who fumbles the bones',
  vikingr: 'Medium — seasoned warrior who plans, then slips',
  jarl: 'Hard — battle-tested ruler with sharp tactics',
  berserkr: 'Extra Hard — frenzied master who strikes true',
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

function favorIncome(dice: PlayerState['dice']): number {
  return dice.filter((d) => d.grantsFavor).length;
}

function availableGods(player: PlayerState): GodFavor[] {
  const available = new Set(sanitizeFavorLoadout(player.availableFavors));
  return GOD_FAVORS.filter((god) => available.has(god.id));
}

function expectedDamage(attack: number, block: number): number {
  return Math.max(0, attack - block);
}

function scoreFavorChoice(
  god: GodFavor,
  me: PlayerState,
  opp: PlayerState,
  counts: Record<DieFace, number>,
  oppCounts: Record<DieFace, number>,
  projectedFavor: number,
  projectedOppFavor: number,
): number {
  const expectedIncoming = expectedDamage(oppCounts.axe, counts.helmet) + expectedDamage(oppCounts.arrow, counts.shield);
  const expectedOutgoing = expectedDamage(counts.axe, oppCounts.helmet) + expectedDamage(counts.arrow, oppCounts.shield);
  let score = 0;

  switch (god.id) {
    case 'thor':
      score = 3 + expectedOutgoing * 1.15 + (opp.hp <= expectedOutgoing + 2 ? 10 : 0) + (opp.hp <= 6 ? 2.5 : 0);
      break;
    case 'idun':
      score = me.hp <= 4 ? 9 : me.hp <= 7 ? 6 : expectedIncoming >= 3 ? 4 : expectedIncoming > 0 ? 2 : 0;
      break;
    case 'baldr':
      score = counts.helmet + counts.shield >= 2 ? (counts.helmet + counts.shield) * 2 + expectedIncoming * 1.4 : 0;
      break;
    case 'skadi':
      score = counts.arrow >= 2 ? counts.arrow * 2.4 + expectedDamage(counts.arrow, oppCounts.shield) * 1.8 : 0;
      break;
    case 'vidar':
      score = counts.axe >= 1 && oppCounts.helmet >= 1 ? 4 + Math.min(2, oppCounts.helmet) * 2.2 : 0;
      break;
    case 'mimir':
      score = expectedIncoming >= 2 ? expectedIncoming * 1.7 + (me.hp <= 8 ? 1.5 : 0) : 0;
      break;
    case 'ullr':
      score = counts.arrow > 0 && oppCounts.shield > 0 ? 3 + Math.min(counts.arrow, oppCounts.shield, 2) * 2.35 : 0;
      break;
    case 'brunhild':
      score = counts.axe >= 2 ? counts.axe * 2.15 + expectedDamage(counts.axe, oppCounts.helmet) * 1.5 : 0;
      break;
    case 'freyr': {
      const majority = Math.max(counts.axe, counts.arrow, counts.helmet, counts.shield, counts.steal);
      score = majority >= 2 ? 3.5 + majority * 1.7 : 0;
      break;
    }
    case 'loki':
      score = Math.max(oppCounts.axe, oppCounts.arrow, oppCounts.steal) >= 1 ? 3 + expectedIncoming * 1.2 + projectedOppFavor * 0.25 : 0;
      break;
    case 'heimdall':
      score = counts.helmet + counts.shield >= 2 && expectedIncoming > 0 ? 3 + Math.min(expectedIncoming, counts.helmet + counts.shield) * 2 : 0;
      break;
    case 'hel':
      score = expectedDamage(counts.axe, oppCounts.helmet) >= 1 ? 3 + expectedDamage(counts.axe, oppCounts.helmet) * 2.15 + (me.hp <= 10 ? 1.2 : 0) : 0;
      break;
    case 'skuld':
      score = counts.arrow >= 1 && projectedOppFavor >= 3 ? 3 + counts.arrow * 1.8 + Math.min(projectedOppFavor, counts.arrow * 2) : 0;
      break;
  }

  if (projectedFavor < god.cost) score -= 2;
  if (projectedOppFavor >= 5 && god.id !== 'idun') score += 0.5;
  return score;
}

function berserkrUrgencyBonus(
  god: GodFavor,
  me: PlayerState,
  opp: PlayerState,
  counts: Record<DieFace, number>,
  oppCounts: Record<DieFace, number>,
  projectedOppFavor: number,
): number {
  switch (god.id) {
    case 'thor':
      return opp.hp <= 6 || counts.axe + counts.arrow >= 2 ? 3.2 : 1.4;
    case 'heimdall':
      return oppCounts.axe + oppCounts.arrow >= 2 && counts.helmet + counts.shield >= 1 ? 3 : me.hp <= 7 ? 1.5 : 0.6;
    case 'skuld':
      return counts.arrow >= 1 && projectedOppFavor >= 2 ? 3.4 : counts.arrow >= 2 ? 1.8 : 0.5;
    case 'idun':
      return me.hp <= 9 ? 2.6 : 0.4;
    case 'vidar':
    case 'ullr':
      return 1.6;
    default:
      return 0.8;
  }
}

function bestFavorScore(
  me: PlayerState,
  opp: PlayerState,
  counts: Record<DieFace, number>,
  oppCounts: Record<DieFace, number>,
  projectedFavor: number,
  projectedOppFavor: number,
): number {
  return availableGods(me)
    .filter((god) => projectedFavor >= god.cost)
    .reduce((best, god) => Math.max(best, scoreFavorChoice(god, me, opp, counts, oppCounts, projectedFavor, projectedOppFavor)), 0);
}

function nextFavorBreakpoint(player: PlayerState, projectedFavor: number): number | null {
  const gaps = availableGods(player)
    .map((god) => god.cost - projectedFavor)
    .filter((gap) => gap > 0)
    .sort((a, b) => a - b);
  return gaps[0] ?? null;
}

function desiredKeepSet(
  player: PlayerState,
  extraIds: Iterable<number> = [],
): Set<number> {
  const keep = new Set(player.dice.filter((d) => d.kept).map((d) => d.id));
  Array.from(extraIds).forEach((id) => keep.add(id));
  return keep;
}

function countsForKeepSet(player: PlayerState, keep: Set<number>): Record<DieFace, number> {
  return countFaces(player.dice.filter((die) => keep.has(die.id)));
}

function favorIncomeForKeepSet(player: PlayerState, keep: Set<number>): number {
  return favorIncome(player.dice.filter((die) => keep.has(die.id)));
}

function evaluateKeepPlan(
  snap: GameSnapshot,
  side: PlayerSide,
  keep: Set<number>,
  diff: Difficulty,
): number {
  const me = snap[side];
  const opp = snap[side === 'host' ? 'guest' : 'host'];
  const counts = countsForKeepSet(me, keep);
  const oppCounts = countFaces(committedDice(opp));
  const projectedFavor = me.favor + favorIncomeForKeepSet(me, keep);
  const projectedOppFavor = opp.favor + favorIncome(committedDice(opp));
  const outgoing = expectedDamage(counts.axe, oppCounts.helmet) + expectedDamage(counts.arrow, oppCounts.shield);
  const incoming = expectedDamage(oppCounts.axe, counts.helmet) + expectedDamage(oppCounts.arrow, counts.shield);
  const blocked = Math.min(counts.helmet, oppCounts.axe) + Math.min(counts.shield, oppCounts.arrow);
  const keepCount = keep.size;
  const bestCast = bestFavorScore(me, opp, counts, oppCounts, projectedFavor, projectedOppFavor);
  const favorGap = nextFavorBreakpoint(me, projectedFavor);
  const nearBreakpointBonus = favorGap === 1 ? 2.8 : favorGap === 2 ? 1.5 : favorGap === null ? 0.75 : 0;
  const stealValue = counts.steal * (projectedOppFavor >= 5 ? 3.2 : projectedOppFavor >= 3 ? 2.4 : projectedOppFavor > 0 ? 1.5 : 0.5);
  const favorValue = favorIncomeForKeepSet(me, keep) * (projectedFavor < 4 ? 2.2 : projectedFavor < 6 ? 1.4 : 0.9);
  const flexibilityFactor = diff === 'berserkr' ? 0.8 : diff === 'jarl' ? 0.95 : 1.05;
  const flexibility = me.rollsLeft > 1 ? (6 - keepCount) * flexibilityFactor : keepCount * 0.15;

  let score = 0;
  score += outgoing * 6.7;
  score -= incoming * (me.hp <= 5 ? 8.9 : 7.1);
  score += blocked * 2.35;
  score += stealValue;
  score += favorValue + nearBreakpointBonus;
  score += bestCast * 0.65;
  score += flexibility;

  if (outgoing >= opp.hp) score += 22;
  if (incoming >= me.hp) score -= 24;
  if (me.hp <= 6 && incoming > 0) score -= 2.5;
  if (opp.hp <= 5 && outgoing > 0) score += 2;
  if (counts.axe > 0 && counts.arrow > 0) score += 0.6;
  if (counts.helmet === 0 && oppCounts.axe >= 2) score -= 1.4;
  if (counts.shield === 0 && oppCounts.arrow >= 2) score -= 1.4;
  return score;
}

function chooseStrategy(
  me: PlayerState,
  opp: PlayerState,
  myCommitted: Record<DieFace, number>,
  oppCommitted: Record<DieFace, number>,
  diff: Difficulty,
): Strategy {
  const projectedFavor = me.favor + favorIncome(committedDice(me));
  const projectedOppFavor = opp.favor + favorIncome(committedDice(opp));
  const incoming = expectedDamage(oppCommitted.axe, myCommitted.helmet) + expectedDamage(oppCommitted.arrow, myCommitted.shield);
  const pressure = me.hp <= 6 || incoming >= 3;
  const canThreatenFavor = bestFavorScore(opp, me, oppCommitted, myCommitted, projectedOppFavor, projectedFavor) >= 5;
  const behindOnFavor = projectedFavor < 4;
  const lethalReach = opp.hp <= expectedDamage(myCommitted.axe, oppCommitted.helmet) + expectedDamage(myCommitted.arrow, oppCommitted.shield) + 2;

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

  if (diff === 'jarl') {
    const good = lethalReach ? 'offense' : pressure ? 'defense' : canThreatenFavor ? 'disrupt' : behindOnFavor ? 'favor' : 'offense';
    if (Math.random() < 0.07) {
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
  snap: GameSnapshot,
  side: PlayerSide,
  die: PlayerState['dice'][number],
  me: PlayerState,
  _opp: PlayerState,
  _myCommitted: Record<DieFace, number>,
  _oppCommitted: Record<DieFace, number>,
  strategy: Strategy,
  diff: Difficulty,
): number {
  const baseKeep = desiredKeepSet(me);
  const nextKeep = desiredKeepSet(me, [die.id]);
  let value = evaluateKeepPlan(snap, side, nextKeep, diff) - evaluateKeepPlan(snap, side, baseKeep, diff);
  if (strategy === 'offense' && (die.face === 'axe' || die.face === 'arrow')) value += 0.75;
  if (strategy === 'defense' && (die.face === 'helmet' || die.face === 'shield')) value += 0.75;
  if (strategy === 'favor' && die.grantsFavor) value += 0.9;
  if (strategy === 'disrupt' && die.face === 'steal') value += 1;
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
    score: dieValue(snap, side, d, me, opp, myCommitted, oppCommitted, strategy, diff),
    kept: d.kept,
  }));

  if (diff === 'skald') {
    return scores
      .filter((s) => s.kept || s.score >= 7 || Math.random() < 0.32)
      .map((s) => s.id);
  }

  if (diff === 'vikingr') {
    const locked = me.dice.filter((d) => d.kept).map((d) => d.id);
    const candidates = me.dice.filter((d) => !d.kept).map((d) => d.id);
    let bestIds = [...locked];
    let bestScore = -Infinity;
    for (let mask = 0; mask < (1 << candidates.length); mask += 1) {
      const ids = [...locked];
      candidates.forEach((id, index) => {
        if (mask & (1 << index)) ids.push(id);
      });
      const score = evaluateKeepPlan(snap, side, new Set(ids), diff);
      if (score > bestScore) {
        bestScore = score;
        bestIds = ids;
      }
    }
    if (Math.random() < 0.14) {
      return scores
        .filter((s) => s.kept || s.score >= (me.rollsLeft <= 1 ? 4.1 : 5))
        .map((s) => s.id);
    }
    return bestIds;
  }

  const locked = me.dice.filter((d) => d.kept).map((d) => d.id);
  const candidates = me.dice.filter((d) => !d.kept).map((d) => d.id);
  let bestIds = [...locked];
  let bestScore = -Infinity;
  for (let mask = 0; mask < (1 << candidates.length); mask += 1) {
    const ids = [...locked];
    candidates.forEach((id, index) => {
      if (mask & (1 << index)) ids.push(id);
    });
    const score = evaluateKeepPlan(snap, side, new Set(ids), diff);
    if (
      score > bestScore
      || (score === bestScore && me.rollsLeft > 1 && ids.length < bestIds.length)
      || (score === bestScore && me.rollsLeft <= 1 && ids.length > bestIds.length)
    ) {
      bestScore = score;
      bestIds = ids;
    }
  }
  return bestIds;
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
  const scores = me.dice.map((d) => dieValue(snap, side, d, me, opp, myCommitted, oppCommitted, strategy, diff));
  const rerollableLow = scores.filter((s, i) => !me.dice[i].kept && !me.dice[i].selected && s <= 3.75).length;
  const selectedNow = me.dice.filter((d) => d.kept || d.selected).length;

  if (diff === 'skald') {
    if (me.rollsLeft <= 1) return 'stand';
    if (rerollableLow >= 2) return Math.random() < 0.7 ? 'reroll' : 'stand';
    return Math.random() < 0.4 ? 'reroll' : 'stand';
  }
  const finishValue = evaluateKeepPlan(snap, side, new Set(me.dice.map((d) => d.id)), diff);
  const bestKeep = new Set(desiredKeepIds(snap, side, diff));
  const keepValue = evaluateKeepPlan(snap, side, bestKeep, diff);
  const rerollBudgetFactor = diff === 'berserkr' ? 1.25 : diff === 'jarl' ? 1.4 : 1.6;
  const rerollBudget = (6 - bestKeep.size) * rerollBudgetFactor;
  const oppIncoming = expectedDamage(oppCommitted.axe, myCommitted.helmet) + expectedDamage(oppCommitted.arrow, myCommitted.shield);

  if (me.rollsLeft <= 1) return 'stand';
  if (finishValue >= keepValue + rerollBudget) return 'stand';
  if (oppIncoming >= me.hp && selectedNow >= 4) return 'stand';
  if (selectedNow >= 5 && finishValue >= keepValue - 1) return 'stand';
  if (rerollableLow >= (diff === 'vikingr' ? 2 : 1)) return 'reroll';
  return diff === 'vikingr' && Math.random() < 0.12 ? 'stand' : 'reroll';
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
  const favorAtInvoke = me.favor + favorIncome(me.dice);
  const oppFavorAtInvoke = opp.favor + favorIncome(opp.dice);

  // Score each favor's value in the current state
  const candidates: { god: GodFavor; score: number }[] = [];
  availableGods(me).forEach((god) => {
    const baseScore = scoreFavorChoice(god, me, opp, counts, oppCounts, favorAtInvoke, oppFavorAtInvoke);
    const urgency = berserkrUrgencyBonus(god, me, opp, counts, oppCounts, oppFavorAtInvoke);
    const score = diff === 'berserkr'
      ? baseScore + urgency
      : diff === 'jarl'
        ? baseScore + urgency * 0.45
        : baseScore;
    candidates.push({ god, score });
  });

  candidates.sort((a, b) => b.score - a.score);

  const picks: string[] = [];

  const randomness = diff === 'skald' ? 0.7 : diff === 'vikingr' ? 0.18 : diff === 'jarl' ? 0.06 : 0;

  for (const c of candidates) {
    if (c.score <= 0) continue;
    if (favorAtInvoke < c.god.cost) continue;
    if (Math.random() < randomness) continue;
    const threshold = diff === 'skald' ? 6 : diff === 'vikingr' ? 3.5 : diff === 'jarl' ? 1.8 : 0.75;
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
    if (diff === 'skald') return 700 + Math.random() * 800;
    if (diff === 'vikingr') return 500 + Math.random() * 700;
    if (diff === 'jarl') return 420 + Math.random() * 620;
    return 350 + Math.random() * 600;
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
