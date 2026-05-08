import { MAX_HP } from '../game/engine';
import { GOD_FAVOR_MAP } from '../game/types';
import type { DieFace, GameSnapshot, PlayerSide, ResolutionStep } from '../game/types';
import type { Difficulty } from '../ai/orlogAI';
import { incrementAchievement, unlockAchievement } from './playGames';

export type AchievementSessionKind = 'solo' | 'code' | 'matchmaking';

interface AchievementRunState {
  damageTaken: number;
  currentRound: number;
  blockedThisRound: number;
  blockedAnyAttack: boolean;
  invokedGodFavor: boolean;
  earlyFavorThisRound: boolean;
  lateFavorThisRound: boolean;
  processedSteps: Set<string>;
  reportedDiceRounds: Set<string>;
  matchEndReported: boolean;
  sessionKind: AchievementSessionKind;
}

const run: AchievementRunState = {
  damageTaken: 0,
  currentRound: 1,
  blockedThisRound: 0,
  blockedAnyAttack: false,
  invokedGodFavor: false,
  earlyFavorThisRound: false,
  lateFavorThisRound: false,
  processedSteps: new Set(),
  reportedDiceRounds: new Set(),
  matchEndReported: false,
  sessionKind: 'code',
};

const AI_WIN_ACHIEVEMENT: Record<Difficulty, 'skald_slayer' | 'vikingr_victor' | 'jarl_breaker' | 'berserkr_bane'> = {
  skald: 'skald_slayer',
  vikingr: 'vikingr_victor',
  jarl: 'jarl_breaker',
  berserkr: 'berserkr_bane',
};

const ALL_FACE_ACHIEVEMENT: Record<DieFace, 'oops_all_axes' | 'pointy_weather' | 'helmet_convention' | 'shield_sandwich' | 'sticky_fingers'> = {
  axe: 'oops_all_axes',
  arrow: 'pointy_weather',
  helmet: 'helmet_convention',
  shield: 'shield_sandwich',
  steal: 'sticky_fingers',
};

export function resetAchievementRun(sessionKind: AchievementSessionKind = 'code') {
  run.damageTaken = 0;
  run.currentRound = 1;
  run.blockedThisRound = 0;
  run.blockedAnyAttack = false;
  run.invokedGodFavor = false;
  run.earlyFavorThisRound = false;
  run.lateFavorThisRound = false;
  run.processedSteps.clear();
  run.reportedDiceRounds.clear();
  run.matchEndReported = false;
  run.sessionKind = sessionKind;
}

function resetRoundIfNeeded(round: number) {
  if (run.currentRound === round) return;
  run.currentRound = round;
  run.blockedThisRound = 0;
  run.earlyFavorThisRound = false;
  run.lateFavorThisRound = false;
}

export function recordResolutionAchievementStep(
  step: ResolutionStep | null | undefined,
  round: number,
  selfSide: PlayerSide | null,
) {
  if (!step || !selfSide) return;
  resetRoundIfNeeded(round);

  const stepKey = `${round}:${step.id}:${step.text}`;
  if (run.processedSteps.has(stepKey)) return;
  run.processedSteps.add(stepKey);

  if (step.kind === 'attack') {
    if (step.target === selfSide && step.damage > 0) run.damageTaken += step.damage;
    if (step.target === selfSide && step.blocked > 0) {
      run.blockedThisRound += step.blocked;
      run.blockedAnyAttack = true;
      if (run.blockedThisRound >= 4) unlockAchievement('shield_wall');
    }
    return;
  }

  if (step.kind === 'steal') {
    if (step.actor === selfSide && step.stolen >= 3) unlockAchievement('favor_thief');
    return;
  }

  if (step.kind !== 'god' || !step.invoked) return;

  if (step.target === selfSide && step.targetHpDelta < 0) run.damageTaken += Math.abs(step.targetHpDelta);
  if (step.actor !== selfSide) return;
  run.invokedGodFavor = true;

  if (step.favorId === 'thor') unlockAchievement('thunder_caller');
  if (step.favorId === 'idun') unlockAchievement('apple_keeper');
  if (step.favorId === 'loki') unlockAchievement('tricksters_mark');
  if (step.favorId === 'skuld' && step.targetFavorDelta < 0) unlockAchievement('norns_claim');

  const god = GOD_FAVOR_MAP[step.favorId];
  if (god) {
    if (god.priority < 40) run.earlyFavorThisRound = true;
    else run.lateFavorThisRound = true;
  }
  if (run.earlyFavorThisRound && run.lateFavorThisRound) unlockAchievement('divine_timing');
}

export function recordFinalDiceAchievements(snap: GameSnapshot, side: PlayerSide) {
  const key = `${snap.round}:${side}`;
  if (run.reportedDiceRounds.has(key)) return;
  const dice = snap[side].dice;
  if (!dice.every((die) => die.kept)) return;
  run.reportedDiceRounds.add(key);

  const face = dice[0]?.face;
  if (!face || !dice.every((die) => die.face === face)) return;
  unlockAchievement('dice_monoculture');
  unlockAchievement(ALL_FACE_ACHIEVEMENT[face]);
}

export function recordMatchEndAchievements(snap: GameSnapshot, selfSide: PlayerSide | null, aiMode: Difficulty | null) {
  if (!selfSide || run.matchEndReported || snap.phase !== 'game-over') return;
  run.matchEndReported = true;
  if (snap.endReason?.kind !== 'normal') return;
  if (snap.winner !== selfSide) return;

  unlockAchievement('first_saga');
  incrementAchievement('saga_veteran', 1);

  const self = snap[selfSide];
  if (self.hp === 1) unlockAchievement('bloodied_victor');
  if (self.hp === MAX_HP && run.damageTaken === 0) unlockAchievement('untouched_fate');
  if (!run.invokedGodFavor) unlockAchievement('gods_on_do_not_disturb');
  if (!run.blockedAnyAttack) unlockAchievement('face_tank');
  if (self.favor >= 15) unlockAchievement('dragon_sits_on_gold');
  if (aiMode) unlockAchievement(AI_WIN_ACHIEVEMENT[aiMode]);
  if (!aiMode && run.sessionKind !== 'solo') {
    if (run.sessionKind === 'matchmaking') incrementAchievement('queue_conqueror', 1);
  }
}
