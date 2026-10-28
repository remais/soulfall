export interface MeleeCleaveDef {
  id: string;
  kind: 'meleeCleave';
  source: 'starter' | 'drop' | 'craft' | 'reward' | 'premium';
  damage: number;
  /** Seconds between swings at attackSpeed 1. */
  cooldown: number;
  arcDeg: number;
  range: number;
  knockback: number;
  /** Only swings when an enemy is within this distance. */
  aimRange: number;
}

export const WEAPONS = {
  heavySword: {
    id: 'heavySword',
    kind: 'meleeCleave',
    source: 'starter',
    damage: 22,
    cooldown: 1.0,
    arcDeg: 150,
    range: 125,
    knockback: 260,
    aimRange: 230,
  },
} as const satisfies Record<string, MeleeCleaveDef>;

export type WeaponId = keyof typeof WEAPONS;
