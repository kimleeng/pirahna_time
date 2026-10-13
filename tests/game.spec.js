import { test, expect } from '@playwright/test';

const state = page => page.evaluate(() => window.__river.snapshot());

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Repeatable natural simulation; no test-only game actions or forced catches.
    let seed = 415;
    Math.random = () => {
      seed += 0x6d2b79f5;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.clock.install();
  await page.goto('/');
});

test('the river renders, instructions work, and pausing preserves the ecosystem', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page.getByRole('heading', { name: 'A quiet river. A hungry world.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Let’s go fishing' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Let’s go fishing' }).click();
  await page.clock.runFor(1200);
  await expect(page.getByRole('button', { name: 'Cast your line' })).toBeEnabled();
  await page.getByRole('button', { name: 'Field guide' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const paused = await state(page);
  await page.clock.runFor(3000);
  expect((await state(page)).elapsed).toBe(paused.elapsed);
  await page.getByRole('button', { name: 'Back to the river' }).click();
  expect((await state(page)).mode).toBe('playing');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'The river can wait.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to fishing' }).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await page.clock.runFor(600);
  expect((await state(page)).phase).toBe('waiting');
  await page.getByRole('button', { name: 'Retrieve bait' }).click();
  expect((await state(page)).phase).toBe('idle');
  await page.getByRole('button', { name: 'Start a new fishing trip' }).click();
  expect((await state(page)).mode).toBe('ready');
  expect(errors).toEqual([]);
});

test('a real cast attracts a fish and controlled reeling lands it', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Let’s go fishing' }).click();
  const initial = await state(page);
  const predators = initial.fish.filter(f => f.kind === 'piranha');
  const safeFish = initial.fish.filter(f => !['piranha', 'minnow'].includes(f.kind))
    .sort((a, b) => Math.min(...predators.map(p => Math.hypot(b.x - p.x, b.y - p.y))) - Math.min(...predators.map(p => Math.hypot(a.x - p.x, a.y - p.y))))[0];
  const box = await page.locator('#river').boundingBox();
  await page.locator('#river').click({ position: { x: safeFish.x / 480 * box.width, y: safeFish.y / 270 * box.height } });
  for (let i = 0; i < 80; i++) {
    await page.clock.runFor(200);
    if ((await state(page)).phase === 'bite') break;
  }
  expect((await state(page)).phase).toBe('bite');
  await page.keyboard.down('Space');
  expect((await state(page)).phase).toBe('reeling');
  let holding = true;
  for (let i = 0; i < 140; i++) {
    await page.clock.runFor(100);
    const current = await state(page);
    if (current.phase !== 'reeling') break;
    if (current.tension > 0.66 && holding) { await page.keyboard.up('Space'); holding = false; }
    else if (current.tension < 0.24 && !holding) { await page.keyboard.down('Space'); holding = true; }
  }
  await page.keyboard.up('Space');
  const landed = await state(page);
  expect(landed.catches).toBe(1);
  expect(landed.hooks).toBe(3);
  await expect(page.locator('#catch-count')).toHaveText('1 / 5');
  await page.screenshot({ path: testInfo.outputPath('fishing.png'), fullPage: true });
});

test('mobile has no horizontal overflow and supports touch casting and reel controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Let’s go fishing' }).click();
  const box = await page.locator('#river').boundingBox();
  await page.locator('#river').click({ position: { x: box.width * 0.45, y: box.height * 0.62 } });
  await page.clock.runFor(600);
  expect(['waiting', 'bite']).toContain((await state(page)).phase);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('heading', { name: 'The river can wait.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to fishing' }).click();
  expect((await state(page)).mode).toBe('playing');
});
