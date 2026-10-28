import { ABILITIES } from '../../data/abilities';
import { COMBAT_RULES } from '../../data/combatRules';
import { effectiveCooldown, scaledRadius } from '../combat/combatMath';
import { hitEnemy } from '../combat/damage';
import type { Player, World } from '../world';

const hitBuffer: number[] = [];

/** Damages every active enemy within `radius` of (x, y), pushing them outward. Returns hit count. */
function radialHit(
  world: World,
  p: Player,
  x: number,
  y: number,
  radius: number,
  damage: number,
  knockback: number,
  stun: number,
): number {
  let hits = 0;
  for (const i of world.grid.query(x, y, radius + 32, hitBuffer)) {
    const e = world.enemies[i]!;
    if (!e.active) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = Math.hypot(dx, dy);
    if (d > radius + e.radius) continue;
    const nx = d > 1e-6 ? dx / d : 1;
    const ny = d > 1e-6 ? dy / d : 0;
    if (stun > 0) {
      e.stun = Math.max(e.stun, stun);
      // A stun interrupts a telegraphed attack.
      if (e.state === 'windup') {
        e.state = 'recover';
        e.stateTimer = 0.2;
      }
    }
    hitEnemy(world, p, e, damage, knockback, nx, ny);
    hits++;
  }
  return hits;
}

/**
 * Q: Seismic Slam. E: Guardian's Wrath.
 * Held-to-cast: each fires as soon as it is ready while its key is down.
 */
export function updateVanguardAbilities(world: World, p: Player): void {
  const dt = world.dt;
  if (p.ability1Cooldown > 0) p.ability1Cooldown = Math.max(0, p.ability1Cooldown - dt);
  if (p.ability2Cooldown > 0) p.ability2Cooldown = Math.max(0, p.ability2Cooldown - dt);

  const slam = ABILITIES.seismicSlam;
  if (p.cmd.ability1 && p.ability1Cooldown <= 0) {
    const radius = scaledRadius(slam.radius, p.stats);
    world.events.push({ type: 'slam', playerId: p.id, x: p.x, y: p.y, radius });
    radialHit(world, p, p.x, p.y, radius, slam.damage, slam.knockback, slam.stunSeconds);
    p.ability1Cooldown = effectiveCooldown(slam.cooldown, p.stats, COMBAT_RULES);
  }

  const wrath = ABILITIES.guardiansWrath;
  if (p.cmd.ability2 && p.ability2Cooldown <= 0) {
    p.wrathTimer = wrath.duration;
    p.wrathPulseTimer = 0;
    // Count pulses explicitly so float drift can't add an extra one at the end.
    p.wrathPulsesLeft = Math.round(wrath.duration / wrath.pulseInterval);
    p.ability2Cooldown = effectiveCooldown(wrath.cooldown, p.stats, COMBAT_RULES);
    world.events.push({ type: 'wrathStart', playerId: p.id });
  }

  if (p.wrathPulsesLeft > 0) {
    if (p.wrathPulseTimer <= 1e-9) {
      p.wrathPulsesLeft--;
      p.wrathPulseTimer += wrath.pulseInterval;
      const radius = scaledRadius(wrath.pulseRadius, p.stats);
      world.events.push({ type: 'wrathPulse', playerId: p.id, x: p.x, y: p.y, radius });
      radialHit(world, p, p.x, p.y, radius, wrath.pulseDamage, wrath.pulseKnockback, 0);
    }
    p.wrathPulseTimer -= dt;
  }

  if (p.wrathTimer > 0) {
    p.wrathTimer = Math.max(0, p.wrathTimer - dt);
    if (p.wrathTimer <= 1e-9) {
      p.wrathTimer = 0;
      world.events.push({ type: 'wrathEnd', playerId: p.id });
    }
  }
}
