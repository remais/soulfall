import { ENEMIES, type EnemyId } from '../../data/enemies';
import { hitPlayer } from '../combat/damage';
import { resolveStatic } from '../core/collision';
import type { Enemy, Player, World } from '../world';

const neighbours: number[] = [];
/** Knockback velocity decays by this factor per second (exponential damping). */
const KNOCKBACK_DAMPING = 9;
/** Extra reach granted when the windup resolves, so a hit isn't lost to 1px of drift. */
const ATTACK_GRACE = 10;

export function createEnemyPool(capacity: number): Enemy[] {
  return Array.from({ length: capacity }, (_, slot) => ({
    slot,
    id: 0,
    active: false,
    defId: 'riftHusk' as EnemyId,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    kbX: 0,
    kbY: 0,
    radius: 0,
    hp: 0,
    maxHp: 0,
    speed: 0,
    mass: 1,
    stun: 0,
    state: 'chase' as const,
    stateTimer: 0,
    attackCooldown: 0,
    targetPlayer: 0,
  }));
}

/** Activates a pooled enemy. Returns undefined when the pool is full. */
export function spawnEnemy(
  world: World,
  defId: EnemyId,
  x: number,
  y: number,
  healthMult = 1,
): Enemy | undefined {
  const e = world.enemies.find((en) => !en.active);
  if (!e) return undefined;
  const def = ENEMIES[defId];
  e.id = world.nextId++;
  e.active = true;
  e.defId = defId;
  e.x = e.prevX = x;
  e.y = e.prevY = y;
  e.kbX = e.kbY = 0;
  e.radius = def.radius;
  e.maxHp = e.hp = def.maxHealth * healthMult;
  e.speed = def.speed;
  e.mass = def.mass;
  e.stun = 0;
  e.state = 'chase';
  e.stateTimer = 0;
  e.attackCooldown = 0;
  e.targetPlayer = 0;
  resolveStatic(e, e.radius, world.arena);
  world.activeEnemies++;
  return e;
}

function nearestAlivePlayer(world: World, x: number, y: number): Player | undefined {
  let best: Player | undefined;
  let bestD2 = Infinity;
  for (const p of world.players) {
    if (!p.alive) continue;
    const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = p;
    }
  }
  return best;
}

export function rebuildGrid(world: World): void {
  world.grid.clear();
  for (const e of world.enemies) if (e.active) world.grid.insert(e.slot, e.x, e.y);
}

export function updateEnemies(world: World): void {
  const dt = world.dt;
  const damp = Math.exp(-KNOCKBACK_DAMPING * dt);

  // 1. Steering + knockback.
  for (const e of world.enemies) {
    if (!e.active) continue;
    e.prevX = e.x;
    e.prevY = e.y;
    if (e.attackCooldown > 0) e.attackCooldown -= dt;
    if (e.stun > 0) e.stun = Math.max(0, e.stun - dt);

    const target = nearestAlivePlayer(world, e.x, e.y);
    if (target && e.stun <= 0 && e.state === 'chase') {
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const d = Math.hypot(dx, dy);
      const stopAt = e.radius + target.radius;
      if (d > stopAt) {
        const step = Math.min(e.speed * dt, d - stopAt);
        e.x += (dx / d) * step;
        e.y += (dy / d) * step;
      }
    }
    e.x += e.kbX * dt;
    e.y += e.kbY * dt;
    e.kbX *= damp;
    e.kbY *= damp;
  }

  // 2. Separation (soft, half correction each) + push out of players + static geometry.
  rebuildGrid(world);
  for (const e of world.enemies) {
    if (!e.active) continue;
    for (const j of world.grid.query(e.x, e.y, e.radius * 2 + 4, neighbours)) {
      if (j <= e.slot) continue;
      const o = world.enemies[j]!;
      if (!o.active) continue;
      const dx = o.x - e.x;
      const dy = o.y - e.y;
      const min = e.radius + o.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2);
      const nx = d > 1e-6 ? dx / d : 1;
      const ny = d > 1e-6 ? dy / d : 0;
      const push = (min - d) * 0.5;
      e.x -= nx * push;
      e.y -= ny * push;
      o.x += nx * push;
      o.y += ny * push;
    }
    for (const p of world.players) {
      if (!p.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const min = e.radius + p.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        const d = Math.sqrt(d2);
        const nx = d > 1e-6 ? dx / d : 1;
        const ny = d > 1e-6 ? dy / d : 0;
        e.x = p.x + nx * min;
        e.y = p.y + ny * min;
      }
    }
    resolveStatic(e, e.radius, world.arena);
  }

  // 3. Telegraphed melee attacks.
  for (const e of world.enemies) {
    if (!e.active) continue;
    const def = ENEMIES[e.defId];
    const target = nearestAlivePlayer(world, e.x, e.y);
    if (!target) continue;
    const reach = e.radius + target.radius + def.attackRange;
    const dist = Math.hypot(target.x - e.x, target.y - e.y);

    if (e.state === 'chase') {
      if (e.stun <= 0 && e.attackCooldown <= 0 && dist <= reach) {
        e.state = 'windup';
        e.stateTimer = def.windup;
        e.targetPlayer = target.id;
        world.events.push({ type: 'enemyWindup', slot: e.slot });
      }
    } else if (e.state === 'windup') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        const victim = world.players.find((p) => p.id === e.targetPlayer);
        if (victim && victim.alive && Math.hypot(victim.x - e.x, victim.y - e.y) <= reach + ATTACK_GRACE) {
          hitPlayer(world, victim, def.damage);
        }
        e.state = 'recover';
        e.stateTimer = 0.25;
        e.attackCooldown = def.attackCooldown;
      }
    } else {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'chase';
    }
  }
}
