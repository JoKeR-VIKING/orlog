import { chromium } from '@playwright/test';

const baseUrl = process.env.ORLOG_URL || 'http://127.0.0.1:8013/';

const browser = await chromium.launch({
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'docs/screenshots/home.png', fullPage: true });

await page.getByTestId('toggle-solo-button').click();
await page.getByTestId('difficulty-skald-button').click();
await page.getByTestId('game-screen').waitFor({ state: 'visible' });
await page.waitForTimeout(1800);
await page.screenshot({ path: 'docs/screenshots/solo-game.png', fullPage: true });

await browser.close();
