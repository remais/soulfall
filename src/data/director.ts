/** Wave pacing for the Phase 1A combat prototype (endless survival). */
export const DIRECTOR = {
  /** Enemies per second at t=0. */
  baseSpawnRate: 0.9,
  /** Added spawn rate per minute survived. */
  spawnRatePerMinute: 1.4,
  maxSpawnRate: 9,
  /** Enemy max HP multiplier grows by this fraction per minute. */
  healthPerMinute: 0.14,
  spawnDistanceMin: 640,
  spawnDistanceMax: 860,
  maxAlive: 450,
  /** Every surgeInterval seconds a ring of enemies spawns around the player. */
  surgeInterval: 40,
  surgeFirstAt: 30,
  surgeCount: 22,
  surgeCountPerMinute: 6,
} as const;
