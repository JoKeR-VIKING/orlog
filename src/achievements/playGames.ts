import { Capacitor, registerPlugin } from '@capacitor/core';
import { GOOGLE_PLAY_ACHIEVEMENT_IDS } from './googlePlayAchievementIds';
import type { AchievementKey } from './googlePlayAchievementIds';

interface PlayGamesAchievementsPlugin {
  isAuthenticated(): Promise<{ authenticated: boolean }>;
  signIn(): Promise<{ authenticated: boolean }>;
  unlock(options: { achievementId: string }): Promise<void>;
  increment(options: { achievementId: string; steps: number }): Promise<void>;
  showAchievements(): Promise<void>;
}

const PlayGamesAchievements = registerPlugin<PlayGamesAchievementsPlugin>('PlayGamesAchievements');
let warnedMissingIds = false;
let authAttempted = false;

function isAndroid() {
  return Capacitor.getPlatform() === 'android';
}

function googleIdFor(key: AchievementKey): string | null {
  const id = GOOGLE_PLAY_ACHIEVEMENT_IDS[key];
  if (id) return id;
  if (!warnedMissingIds) {
    warnedMissingIds = true;
    console.warn('Google Play achievement IDs are empty. Paste Play Console IDs into src/achievements/googlePlayAchievementIds.ts.');
  }
  return null;
}

export async function unlockAchievement(key: AchievementKey) {
  if (!isAndroid()) return;
  const achievementId = googleIdFor(key);
  if (!achievementId) return;
  try {
    await PlayGamesAchievements.unlock({ achievementId });
  } catch (error) {
    console.warn(`Unable to unlock Play Games achievement ${key}.`, error);
  }
}

export async function incrementAchievement(key: AchievementKey, steps = 1) {
  if (!isAndroid()) return;
  const achievementId = googleIdFor(key);
  if (!achievementId) return;
  try {
    await PlayGamesAchievements.increment({ achievementId, steps });
  } catch (error) {
    console.warn(`Unable to increment Play Games achievement ${key}.`, error);
  }
}

export async function showAchievements() {
  if (!isAndroid()) return;
  try {
    await PlayGamesAchievements.showAchievements();
  } catch (error) {
    console.warn('Unable to show Play Games achievements.', error);
  }
}

export async function ensurePlayGamesSignedIn(options: { force?: boolean } = {}) {
  if (!isAndroid()) return false;
  if (authAttempted && !options.force) return false;
  try {
    authAttempted = true;
    const current = await PlayGamesAchievements.isAuthenticated();
    if (current.authenticated) return true;
    const signedIn = await PlayGamesAchievements.signIn();
    return signedIn.authenticated;
  } catch (error) {
    console.warn('Unable to authenticate with Play Games.', error);
    return false;
  }
}
