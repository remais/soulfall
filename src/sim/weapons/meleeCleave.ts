import { COMBAT_RULES } from '../../data/combatRules';
import type { MeleeCleaveDef } from '../../data/weapons';
import { attackInterval, scaledRadius } from '../combat/combatMath';
import { hitEnemy } from '../combat/damage';
import type { Enemy, Player, World } from '../world';

const scratch: number[] = [];
const hitBuffer: number[] = [];

function nearestEnemy(world: World, x: number, y: number, maxDist: number): Enemy | undefined {
  let best: Enemy | undefined;
  let bestD2 = maxDist * maxDist;
  for (const i of world.grid.query(x, y, maxDist, scratch)) {
    const e = world.enemies[i]!;
    if (!e.active) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = e;
    }
  }
  return best;
}

/** Automatic arc cleave toward the nearest enemy. Swings only when something is in reach. */
export function updateMeleeCleave(world: World, p: Player, def: MeleeCleaveDef): void {
  if (p.weaponTimer > 0) p.weaponTimer = Math.max(0, p.weaponTimer - world.dt);
  if (p.weaponTimer > 0) return;

  const target = nearestEnemy(world, p.x, p.y, def.aimRange);
  if (!target) return;

  const angle = Math.atan2(target.y - p.y, target.x - p.x);
  const aimX = Math.cos(angle);
  const aimY = Math.sin(angle);
  const range = scaledRadius(def.range, p.stats);
  const halfArc = (def.arcDeg * Math.PI) / 180 / 2;
  const cosHalf = Math.cos(halfArc);

  world.events.push({ type: 'swing', playerId: p.id, x: p.x, y: p.y, angle, arc: halfArc * 2, range });

  for (const i of world.grid.query(p.x, p.y, range + 40, hitBuffer)) {
    const e = world.enemies[i]!;
    if (!e.active) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range + e.radius) continue;
    const nx = d > 1e-6 ? dx / d : aimX;
    const ny = d > 1e-6 ? dy / d : aimY;
    const inArc = nx * aimX + ny * aimY >= cosHalf;
    const hugging = d <= p.radius + e.radius + 6;
    if (!inArc && !hugging) continue;
    hitEnemy(world, p, e, def.damage, def.knockback, nx, ny);
  }

  p.weaponTimer = attackInterval(def.cooldown, p.stats, COMBAT_RULES);
}
