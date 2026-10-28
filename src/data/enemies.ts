export interface EnemyDef {
  id: string;
  maxHealth: number;
  speed: number;
  radius: number;
  /** Mass divides incoming knockback. */
  mass: number;
  damage: number;
  /** Extra reach beyond touching distance. */
  attackRange: number;
  /** Telegraph time before the hit lands. */
  windup: number;
  attackCooldown: number;
}

export const ENEMIES = {
  riftHusk: {
    id: 'riftHusk',
    maxHealth: 34,
    speed: 92,
    radius: 15,
    mass: 1,
    damage: 10,
    attackRange: 14,
    windup: 0.45,
    attackCooldown: 1.2,
  },
} as const satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;
