import type { ArenaDef } from '../../data/arena';

/** Pushes a circle out of arena obstacles and keeps it inside the bounds. Mutates `pos`. */
export function resolveStatic(pos: { x: number; y: number }, radius: number, arena: ArenaDef): void {
  for (const o of arena.obstacles) {
    const dx = pos.x - o.x;
    const dy = pos.y - o.y;
    const min = radius + o.r;
    const d2 = dx * dx + dy * dy;
    if (d2 < min * min) {
      const d = Math.sqrt(d2);
      if (d > 1e-6) {
        pos.x = o.x + (dx / d) * min;
        pos.y = o.y + (dy / d) * min;
      } else {
        pos.x = o.x + min;
      }
    }
  }
  if (pos.x < radius) pos.x = radius;
  else if (pos.x > arena.width - radius) pos.x = arena.width - radius;
  if (pos.y < radius) pos.y = radius;
  else if (pos.y > arena.height - radius) pos.y = arena.height - radius;
}
