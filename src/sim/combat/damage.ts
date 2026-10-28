import { COMBAT_RULES } from '../../data/combatRules';
import { lifeStealHeal, mitigate, rollDamage } from './combatMath';
import type { Enemy, Player, World } from '../world';
import { ABILITIES } from '../../data/abilities';
import { CLASSES } from '../../data/classes';

/** Rolls and applies player -> enemy damage, with knockback along (dirX, dirY). Returns damage dealt. */
export function hitEnemy(
  world: World,
  player: Player,
  enemy: Enemy,
  baseDamage: number,
  knockback: number,
  dirX: number,
  dirY: number,
): number {
  const roll = rollDamage(baseDamage, player.stats, world.rng);
  const dealt = Math.min(enemy.hp, roll.amount);
  enemy.hp -= roll.amount;
  enemy.kbX += (dirX * knockback) / enemy.mass;
  enemy.kbY += (dirY * knockback) / enemy.mass;
  world.stats.damageDealt += dealt;
  world.events.push({
    type: 'enemyDamaged',
    slot: enemy.slot,
    x: enemy.x,
    y: enemy.y,
    amount: roll.amount,
    crit: roll.crit,
  });

  const heal = lifeStealHeal(dealt, player.stats);
  if (heal > 0) player.hp = Math.min(player.stats.maxHealth, player.hp + heal);

  if (enemy.hp <= 0) killEnemy(world, enemy);
  return dealt;
}

export function killEnemy(world: World, enemy: Enemy): void {
  if (!enemy.active) return;
  enemy.active = false;
  world.activeEnemies--;
  world.stats.kills++;
  world.events.push({ type: 'enemyDied', slot: enemy.slot, x: enemy.x, y: enemy.y });
}

/** Enemy -> player damage. Respects dodge/hurt iframes and Guardian's Wrath. */
export function hitPlayer(world: World, player: Player, raw: number): void {
  if (!player.alive || player.iframes > 0 || player.invulnerable) return;
  const extra = player.wrathTimer > 0 ? [ABILITIES.guardiansWrath.damageReduction] : [];
  const amount = mitigate(raw, player.stats, COMBAT_RULES, extra);
  player.hp -= amount;
  player.iframes = CLASSES[player.classId].hurtIframes;
  world.stats.damageTaken += amount;
  world.events.push({ type: 'playerDamaged', playerId: player.id, amount });
  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    world.events.push({ type: 'playerDied', playerId: player.id });
  }
}
