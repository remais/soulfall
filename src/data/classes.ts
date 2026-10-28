import type { StatModifier } from '../sim/combat/stats';
import type { AbilityId } from './abilities';
import type { WeaponId } from './weapons';

export interface ClassDef {
  id: string;
  source: 'starter' | 'reward' | 'premium';
  radius: number;
  startingWeapon: WeaponId;
  abilities: [AbilityId, AbilityId];
  /** Class identity expressed as stat modifiers on top of BASE_STATS. */
  baseModifiers: StatModifier[];
  dodge: { duration: number; speedMult: number; cooldown: number; iframes: number };
  /** Invulnerability after taking a hit, so hordes can't melt you in one frame. */
  hurtIframes: number;
}

export const CLASSES = {
  vanguard: {
    id: 'vanguard',
    source: 'starter',
    radius: 18,
    startingWeapon: 'heavySword',
    abilities: ['seismicSlam', 'guardiansWrath'],
    baseModifiers: [
      { stat: 'maxHealth', kind: 'flat', value: 50 },
      { stat: 'armor', kind: 'flat', value: 20 },
      { stat: 'moveSpeed', kind: 'flat', value: 10 },
    ],
    dodge: { duration: 0.18, speedMult: 3.6, cooldown: 1.4, iframes: 0.28 },
    hurtIframes: 0.25,
  },
} as const satisfies Record<string, ClassDef>;

export type ClassId = keyof typeof CLASSES;
