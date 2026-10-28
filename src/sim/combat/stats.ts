export const STAT_IDS = [
  'maxHealth',
  'damage',
  'attackSpeed',
  'critChance',
  'critDamage',
  'armor',
  'damageReduction',
  'cooldownReduction',
  'moveSpeed',
  'area',
  'projectileSpeed',
  'projectileCount',
  'statusChance',
  'statusDuration',
  'healing',
  'lifeSteal',
  'luck',
  'xpGain',
  'pickupRadius',
] as const;

export type StatId = (typeof STAT_IDS)[number];
export type StatBlock = Record<StatId, number>;

/**
 * flat:    added to the base value
 * addPct:  summed together, then applied once: x (1 + sum)
 * mult:    each applied separately: x (1 + value)
 */
export type ModifierKind = 'flat' | 'addPct' | 'mult';

export interface StatModifier {
  stat: StatId;
  kind: ModifierKind;
  value: number;
}

export interface StatCap {
  min: number;
  max: number;
}
