import type { CombatRules } from '../sim/combat/combatMath';
import type { StatBlock } from '../sim/combat/stats';

export const COMBAT_RULES: CombatRules = {
  armorK: 100,
  maxTotalMitigation: 0.85,
  minDamage: 1,
  minCooldown: 0.1,
  caps: {
    maxHealth: { min: 1, max: 100_000 },
    damage: { min: 0.1, max: 50 },
    attackSpeed: { min: 0.2, max: 4 },
    critChance: { min: 0, max: 1 },
    critDamage: { min: 1, max: 10 },
    armor: { min: 0, max: 2000 },
    damageReduction: { min: 0, max: 0.6 },
    cooldownReduction: { min: 0, max: 0.6 },
    moveSpeed: { min: 40, max: 520 },
    area: { min: 0.3, max: 4 },
    projectileSpeed: { min: 0.2, max: 4 },
    projectileCount: { min: 0, max: 20 },
    statusChance: { min: 0, max: 1 },
    statusDuration: { min: 0.1, max: 5 },
    healing: { min: 0, max: 5 },
    lifeSteal: { min: 0, max: 0.25 },
    luck: { min: 0, max: 10 },
    xpGain: { min: 0, max: 10 },
    pickupRadius: { min: 10, max: 800 },
  },
};

/** Neutral baseline; classes override selected values. Multipliers are 1 = 100%. */
export const BASE_STATS: StatBlock = {
  maxHealth: 100,
  damage: 1,
  attackSpeed: 1,
  critChance: 0.05,
  critDamage: 1.5,
  armor: 0,
  damageReduction: 0,
  cooldownReduction: 0,
  moveSpeed: 200,
  area: 1,
  projectileSpeed: 1,
  projectileCount: 0,
  statusChance: 0,
  statusDuration: 1,
  healing: 1,
  lifeSteal: 0,
  luck: 0,
  xpGain: 1,
  pickupRadius: 60,
};
