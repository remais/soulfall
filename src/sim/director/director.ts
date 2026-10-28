import { DIRECTOR } from '../../data/director';
import type { EnemyId } from '../../data/enemies';
import { spawnEnemy } from '../enemies/enemySystem';
import { elapsedSeconds, type Player, type World } from '../world';

export function spawnRate(seconds: number): number {
  return Math.min(
    DIRECTOR.maxSpawnRate,
    DIRECTOR.baseSpawnRate + (DIRECTOR.spawnRatePerMinute * seconds) / 60,
  );
}

export function healthMultiplier(seconds: number): number {
  return 1 + (DIRECTOR.healthPerMinute * seconds) / 60;
}

function anchorPlayer(world: World): Player | undefined {
  return world.players.find((p) => p.alive);
}

/** Spawns one enemy at a random point on a ring around (cx, cy), preferring points inside the arena. */
export function spawnAround(
  world: World,
  defId: EnemyId,
  cx: number,
  cy: number,
  minDist: number,
  maxDist: number,
  angle?: number,
): void {
  const { width, height } = world.arena;
  const margin = 40;
  let x = cx;
  let y = cy;
  for (let attempt = 0; attempt < 6; attempt++) {
    const a = angle ?? world.rng.range(0, Math.PI * 2);
    const d = world.rng.range(minDist, maxDist);
    x = cx + Math.cos(a) * d;
    y = cy + Math.sin(a) * d;
    if (x > margin && x < width - margin && y > margin && y < height - margin) break;
    angle = undefined;
  }
  spawnEnemy(world, defId, x, y, healthMultiplier(elapsedSeconds(world)));
}

export function updateDirector(world: World): void {
  const anchor = anchorPlayer(world);
  if (!anchor) return;
  const t = elapsedSeconds(world);

  world.spawnAccumulator += spawnRate(t) * world.dt;
  while (world.spawnAccumulator >= 1) {
    world.spawnAccumulator -= 1;
    if (world.activeEnemies >= DIRECTOR.maxAlive) continue;
    spawnAround(world, 'riftHusk', anchor.x, anchor.y, DIRECTOR.spawnDistanceMin, DIRECTOR.spawnDistanceMax);
  }

  if (t >= world.nextSurgeAt) {
    world.nextSurgeAt += DIRECTOR.surgeInterval;
    const count = Math.round(DIRECTOR.surgeCount + (DIRECTOR.surgeCountPerMinute * t) / 60);
    world.events.push({ type: 'surge' });
    for (let i = 0; i < count; i++) {
      if (world.activeEnemies >= DIRECTOR.maxAlive) break;
      const a = (i / count) * Math.PI * 2;
      spawnAround(
        world,
        'riftHusk',
        anchor.x,
        anchor.y,
        DIRECTOR.spawnDistanceMin,
        DIRECTOR.spawnDistanceMin + 60,
        a,
      );
    }
  }
}
