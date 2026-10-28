import { expect, test, type Page } from '@playwright/test';

interface SoulfallHandle {
  sim: {
    world: { tick: number; activeEnemies: number; state: string };
    player: {
      x: number;
      y: number;
      ability1Cooldown: number;
      ability2Cooldown: number;
      dodgeCooldown: number;
      invulnerable: boolean;
    };
    debugSpawn(n: number, min?: number, max?: number): void;
  };
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test('game boots and renders without console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page).toHaveTitle(/Soulfall/);
  await page.waitForTimeout(2500);
  expect(errors).toEqual([]);
});

test('a run starts and responds to input (dev build)', async ({ page }, info) => {
  test.skip(info.project.name !== 'dev', 'debug handle only exists in dev builds');
  const errors = collectErrors(page);
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __soulfall?: SoulfallHandle }).__soulfall?.sim);

  const tick0 = await page.evaluate(
    () => (window as unknown as { __soulfall: SoulfallHandle }).__soulfall.sim.world.tick,
  );
  await page.waitForTimeout(1000);
  const sim = () =>
    page.evaluate(() => {
      const s = (window as unknown as { __soulfall: SoulfallHandle }).__soulfall.sim;
      return {
        tick: s.world.tick,
        x: s.player.x,
        q: s.player.ability1Cooldown,
        e: s.player.ability2Cooldown,
        dodge: s.player.dodgeCooldown,
        enemies: s.world.activeEnemies,
      };
    });
  const a = await sim();
  expect(a.tick).toBeGreaterThan(tick0);

  await page.keyboard.down('d');
  await page.waitForTimeout(600);
  await page.keyboard.up('d');
  const b = await sim();
  expect(b.x).toBeGreaterThan(a.x + 50);

  await page.keyboard.press('q');
  await page.keyboard.press('e');
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  const c = await sim();
  expect(c.q).toBeGreaterThan(0);
  expect(c.e).toBeGreaterThan(0);
  expect(c.dodge).toBeGreaterThan(0);

  // Pause stops the simulation.
  await page.keyboard.press('Escape');
  const p0 = (await sim()).tick;
  await page.waitForTimeout(500);
  expect((await sim()).tick).toBe(p0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect((await sim()).tick).toBeGreaterThan(p0);

  expect(errors).toEqual([]);
});

test('horde benchmark: 350 enemies (dev build)', async ({ page }, info) => {
  test.skip(info.project.name !== 'dev', 'debug handle only exists in dev builds');
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __soulfall?: SoulfallHandle }).__soulfall?.sim);
  const result = await page.evaluate(async () => {
    const sf = (
      window as unknown as {
        __soulfall: SoulfallHandle & { game: { scene: { getScene(k: string): { simStepMs: number } } } };
      }
    ).__soulfall;
    const measure = (ms: number) =>
      new Promise<number>((res) => {
        let n = 0;
        const t0 = performance.now();
        const f = () => {
          n++;
          if (performance.now() - t0 < ms) requestAnimationFrame(f);
          else res(n / ((performance.now() - t0) / 1000));
        };
        requestAnimationFrame(f);
      });
    const idle = await measure(2000);
    sf.sim.player.invulnerable = true;
    sf.sim.debugSpawn(350, 150, 900);
    await new Promise((r) => setTimeout(r, 500));
    const horde = await measure(3000);
    return {
      idle,
      horde,
      enemies: sf.sim.world.activeEnemies,
      simMs: sf.game.scene.getScene('arena').simStepMs,
    };
  });
  console.log(
    `[bench] idle ${result.idle.toFixed(1)} fps | horde ${result.horde.toFixed(1)} fps with ${result.enemies} enemies | sim ${result.simMs.toFixed(3)} ms/tick`,
  );
  expect(result.enemies).toBeGreaterThanOrEqual(300);
});
