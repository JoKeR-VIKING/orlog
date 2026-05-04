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
import { GOD_FAVORS, GOD_FAVOR_MAP } from '../game/types';

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

function countFaces(dice: PlayerState['dice']): Record<DieFace, number> {
  const c: Record<DieFace, number> = {
    axe: 0, arrow: 0, helmet: 0, shield: 0, steal: 0, earn: 0,
  };
  dice.forEach((d) => (c[d.face] += 1));
  return c;
}

// Simple utility: score a die face's "value" in current game state for the AI player.
function faceValue(
  face: DieFace,
  me: PlayerState,
  opp: PlayerState,
  diff: Difficulty,
): number {
  const lowHp = me.hp <= 6;
  const winning = me.hp - opp.hp >= 3;
  switch (face) {
    case 'axe':
      return 6 + (winning ? 2 : 0);
    case 'arrow':
      return 5 + (winning ? 2 : 0);
    case 'helmet':
      return lowHp ? 7 : 4;
    case 'shield':
      return lowHp ? 7 : 4;
    case 'steal':
      return opp.favor >= 3 ? 5 : 2;
    case 'earn':
      // Higher value on berserkr since it's long-term strategic
      return diff === 'berserkr' ? 5 : diff === 'vikingr' ? 4 : 3;
  }
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
  const opp = snap[side === 'host' ? 'guest' : 'host'];

  const scores = me.dice.map((d) => ({
    id: d.id,
    face: d.face,
    score: faceValue(d.face, me, opp, diff),
    kept: d.kept,
  }));

  // Skald: keep ~30% at random-ish
  if (diff === 'skald') {
    const keepIds = scores
      .filter(() => Math.random() < 0.35)
      .map((s) => s.id);
    // Always keep face with score>=7 (strong defensive) regardless of luck
    scores.forEach((s) => {
      if (s.score >= 7 && !keepIds.includes(s.id)) keepIds.push(s.id);
    });
    return diffKeeps(me, keepIds);
  }

  // Vikingr: keep anything with score>=5 but with 25% chance of skipping a keep (mistake)
  if (diff === 'vikingr') {
    const keepIds = scores
      .filter((s) => s.score >= 5 && Math.random() > 0.25)
      .map((s) => s.id);
    return diffKeeps(me, keepIds);
  }

  // Berserkr: dynamic strategy.
  // Goal: maximize synergy — commit to axes OR arrows based on opponent's block distribution.
  const oppCounts = countFaces(opp.dice);
  const preferAxe = oppCounts.helmet <= oppCounts.shield;
  const keepIds: number[] = [];

  scores.forEach((s) => {
    let v = s.score;
    if (preferAxe && s.face === 'axe') v += 3;
    if (!preferAxe && s.face === 'arrow') v += 3;
    if (me.hp <= 4 && (s.face === 'helmet' || s.face === 'shield')) v += 3;
    if (v >= 6) keepIds.push(s.id);
  });
  // If almost all weak, keep nothing — reroll all
  if (keepIds.length >= 5 && me.rollsLeft > 0) {
    // Keep only the top 4 best to allow reroll of the 2 worst (unless 6/6 are >=6)
    const sorted = scores.slice().sort((a, b) => b.score - a.score);
    return diffKeeps(me, sorted.slice(0, 4).map((s) => s.id));
  }
  return diffKeeps(me, keepIds);
}

// Return die ids whose kept flag needs to be toggled to match desired keepIds set.
function diffKeeps(me: PlayerState, desiredKeep: number[]): number[] {
  const desired = new Set(desiredKeep);
  const toggles: number[] = [];
  me.dice.forEach((d) => {
    const want = desired.has(d.id);
    if (want !== d.kept) toggles.push(d.id);
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

  const scores = me.dice.map((d) => faceValue(d.face, me, snap[side === 'host' ? 'guest' : 'host'], diff));
  const rerollableLow = scores.filter((s, i) => !me.dice[i].kept && s <= 3).length;

  if (diff === 'skald') {
    // 55% reroll if anything rerollable, random otherwise
    if (rerollableLow >= 2) return Math.random() < 0.7 ? 'reroll' : 'stand';
    return Math.random() < 0.4 ? 'reroll' : 'stand';
  }
  if (diff === 'vikingr') {
    // Reroll if >=2 low-score dice, with 15% mistake
    if (rerollableLow >= 2 && Math.random() > 0.15) return 'reroll';
    return 'stand';
  }
  // berserkr
  const unkept = me.dice.filter((d) => !d.kept).length;
  // If we have rolls left and there are >=2 unkept dice, prefer reroll unless on last roll with decent pool
  if (me.rollsLeft >= 2 && unkept >= 2) return 'reroll';
  if (me.rollsLeft === 1 && rerollableLow >= 2) return 'reroll';
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

  // Score each favor's value in the current state
  const candidates: { god: GodFavor; score: number }[] = [];
  GOD_FAVORS.forEach((g) => {
    let s = 0;
    switch (g.id) {
      case 'thor':
        s = 6 + (opp.hp <= 4 ? 8 : 0); // finisher
        break;
      case 'idun':
        s = me.hp <= 6 ? 7 : me.hp <= 10 ? 4 : 0;
        break;
      case 'baldr':
        s = (counts.helmet + counts.shield) >= 2 ? (counts.helmet + counts.shield) * 1.5 : 0;
        break;
      case 'skadi':
        s = counts.arrow >= 2 ? counts.arrow * 2 : 0;
        break;
      case 'vidar':
        s = (oppCounts.helmet + oppCounts.shield) >= 3 && (counts.axe + counts.arrow) >= 3 ? 6 : 1;
        break;
      case 'mimir':
        s = me.hp <= 10 ? 3 : 1;
        break;
    }
    candidates.push({ god: g, score: s });
  });

  candidates.sort((a, b) => b.score - a.score);

  const picks: string[] = [];
  let budget = me.favor;

  const randomness = diff === 'skald' ? 0.55 : diff === 'vikingr' ? 0.18 : 0.04;

  for (const c of candidates) {
    if (c.score <= 0) continue;
    if (budget < c.god.cost) continue;
    // Skald rarely casts favors (adds randomness)
    if (Math.random() < randomness) continue;
    // Difficulty-weighted threshold
    const threshold = diff === 'skald' ? 4 : diff === 'vikingr' ? 3 : 2;
    if (c.score < threshold) continue;
    picks.push(c.god.id);
    budget -= c.god.cost;
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

    // First decide keeps
    const toggles = aiPickKeeps(snap, side, diff);
    toggles.forEach((id) => actions.push({ kind: 'toggle_keep', dieId: id }));

    // Then reroll or stand
    const decision = aiRollDecision(snap, side, diff);
    if (decision === 'reroll') actions.push({ kind: 'reroll' });
    else actions.push({ kind: 'stand' });
  } else if (snap.phase === 'favor') {
    const me = snap[side];
    if (me.favorReady) return actions;
    const picks = aiPickFavors(snap, side, diff);
    picks.forEach((id) => actions.push({ kind: 'cast_favor', favorId: id }));
    actions.push({ kind: 'skip_favors' });
  }
  return actions;
}
