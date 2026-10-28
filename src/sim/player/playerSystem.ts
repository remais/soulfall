import { CLASSES, type ClassDef } from '../../data/classes';
import { resolveStatic } from '../core/collision';
import type { Player, World } from '../world';

/** Movement + dodge for every player. */
export function updatePlayers(world: World): void {
  const dt = world.dt;
  for (const p of world.players) {
    p.prevX = p.x;
    p.prevY = p.y;
    if (!p.alive) continue;

    if (p.iframes > 0) p.iframes = Math.max(0, p.iframes - dt);
    if (p.dodgeCooldown > 0) p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);

    const cmd = p.cmd;
    let mx = cmd.moveX;
    let my = cmd.moveY;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len;
      my /= len;
      p.facingX = mx;
      p.facingY = my;
    }
    p.moving = len > 0;

    const dodge = CLASSES[p.classId].dodge;
    if (cmd.dodge && p.dodgeCooldown <= 0 && p.dodgeTimer <= 0) {
      startDodge(world, p, dodge, len > 0 ? mx : p.facingX, len > 0 ? my : p.facingY);
    }

    let vx: number;
    let vy: number;
    if (p.dodgeTimer > 0) {
      p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);
      vx = p.dodgeDirX * p.stats.moveSpeed * dodge.speedMult;
      vy = p.dodgeDirY * p.stats.moveSpeed * dodge.speedMult;
    } else {
      vx = mx * p.stats.moveSpeed;
      vy = my * p.stats.moveSpeed;
    }
    p.x += vx * dt;
    p.y += vy * dt;
    resolveStatic(p, p.radius, world.arena);
  }
}

function startDodge(world: World, p: Player, dodge: ClassDef['dodge'], dirX: number, dirY: number): void {
  p.dodgeTimer = dodge.duration;
  p.dodgeCooldown = dodge.cooldown;
  p.dodgeDirX = dirX;
  p.dodgeDirY = dirY;
  p.iframes = Math.max(p.iframes, dodge.iframes);
  world.events.push({ type: 'dodge', playerId: p.id, dirX, dirY });
}
