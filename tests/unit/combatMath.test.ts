import { describe, expect, it } from 'vitest';
import { BASE_STATS, COMBAT_RULES } from '../../src/data/combatRules';
import {
  armorMitigation,
  attackInterval,
  computeStat,
  computeStats,
  effectiveCooldown,
  mitigate,
  rollDamage,
} from '../../src/sim/combat/combatMath';
import { STAT_IDS, type StatModifier } from '../../src/sim/combat/stats';
import { Rng } from '../../src/sim/core/rng';

const R = COMBAT_RULES;

describe('computeStat stacking order', () => {
  it('applies flat, then summed additive %, then each multiplier', () => {
    const mods: StatModifier[] = [
      { stat: 'maxHealth', kind: 'flat', value: 50 },
      { stat: 'maxHealth', kind: 'addPct', value: 0.2 },
      { stat: 'maxHealth', kind: 'addPct', value: 0.3 },
      { stat: 'maxHealth', kind: 'mult', value: 0.1 },
      { stat: 'maxHealth', kind: 'mult', value: 0.1 },
      { stat: 'armor', kind: 'flat', value: 999 }, // other stat: ignored
    ];
    // (100 + 50) * (1 + 0.5) * 1.1 * 1.1
    expect(computeStat('maxHealth', 100, mods, R)).toBeCloseTo(150 * 1.5 * 1.21, 9);
  });

  it('returns the base value without modifiers', () => {
    expect(computeStat('moveSpeed', 200, [], R)).toBe(200);
  });

  it('negative additive % below -100% floors at 0 before caps', () => {
    const mods: StatModifier[] = [{ stat: 'damage', kind: 'addPct', value: -3 }];
    expect(computeStat('damage', 1, mods, R)).toBe(R.caps.damage.min);
  });
});

describe('caps', () => {
  it('clamps every stat to its configured max under absurd stacking', () => {
    const mods: StatModifier[] = STAT_IDS.flatMap((stat) => [
      { stat, kind: 'flat' as const, value: 1e9 },
      { stat, kind: 'mult' as const, value: 100 },
    ]);
    const stats = computeStats(BASE_STATS, mods, R);
    for (const id of STAT_IDS) expect(stats[id]).toBe(R.caps[id].max);
  });

  it('clamps every stat to its configured min under negative stacking', () => {
    const mods: StatModifier[] = STAT_IDS.map((stat) => ({ stat, kind: 'flat' as const, value: -1e9 }));
    const stats = computeStats(BASE_STATS, mods, R);
    for (const id of STAT_IDS) expect(stats[id]).toBe(R.caps[id].min);
  });

  it('base stats are within caps', () => {
    for (const id of STAT_IDS) {
      expect(BASE_STATS[id]).toBeGreaterThanOrEqual(R.caps[id].min);
      expect(BASE_STATS[id]).toBeLessThanOrEqual(R.caps[id].max);
    }
  });

  it('cooldown reduction cannot reach zero cooldown', () => {
    const stats = computeStats(BASE_STATS, [{ stat: 'cooldownReduction', kind: 'flat', value: 5 }], R);
    expect(stats.cooldownReduction).toBe(0.6);
    expect(effectiveCooldown(10, stats, R)).toBeCloseTo(4, 9);
    expect(effectiveCooldown(0.05, stats, R)).toBe(R.minCooldown);
  });

  it('attack speed cap bounds the auto-weapon interval', () => {
    const stats = computeStats(BASE_STATS, [{ stat: 'attackSpeed', kind: 'mult', value: 1000 }], R);
    expect(attackInterval(1, stats, R)).toBeCloseTo(1 / R.caps.attackSpeed.max, 9);
  });
});

describe('mitigation', () => {
  it('armor uses armor / (armor + K)', () => {
    expect(armorMitigation(0, R)).toBe(0);
    expect(armorMitigation(100, R)).toBeCloseTo(0.5, 9);
    expect(armorMitigation(-50, R)).toBe(0);
  });

  it('combines armor, DR and temporary reductions multiplicatively', () => {
    // armor 100 -> 0.5 taken, DR 0.2 -> 0.8, wrath 0.45 -> 0.55
    const taken = mitigate(100, { armor: 100, damageReduction: 0.2 }, R, [0.45]);
    expect(taken).toBeCloseTo(100 * 0.5 * 0.8 * 0.55, 9);
  });

  it('total mitigation is capped', () => {
    const taken = mitigate(1000, { armor: 2000, damageReduction: 0.6 }, R, [0.9, 0.9]);
    expect(taken).toBeCloseTo(1000 * (1 - R.maxTotalMitigation), 9);
  });

  it('positive hits deal at least minDamage; zero stays zero', () => {
    expect(mitigate(0.2, { armor: 0, damageReduction: 0 }, R)).toBe(R.minDamage);
    expect(mitigate(0, { armor: 0, damageReduction: 0 }, R)).toBe(0);
  });
});

describe('rollDamage', () => {
  it('never crits at 0% and always crits at 100%', () => {
    const rng = new Rng(1);
    const noCrit = { ...BASE_STATS, critChance: 0 };
    const allCrit = { ...BASE_STATS, critChance: 1, critDamage: 2 };
    for (let i = 0; i < 100; i++) {
      expect(rollDamage(10, noCrit, rng)).toEqual({ amount: 10, crit: false });
      expect(rollDamage(10, allCrit, rng)).toEqual({ amount: 20, crit: true });
    }
  });

  it('crit rate converges to critChance', () => {
    const rng = new Rng(42);
    const stats = { ...BASE_STATS, critChance: 0.25 };
    let crits = 0;
    for (let i = 0; i < 20000; i++) if (rollDamage(1, stats, rng).crit) crits++;
    expect(crits / 20000).toBeGreaterThan(0.23);
    expect(crits / 20000).toBeLessThan(0.27);
  });

  it('scales with the damage multiplier', () => {
    const rng = new Rng(3);
    expect(rollDamage(10, { ...BASE_STATS, critChance: 0, damage: 1.5 }, rng).amount).toBe(15);
  });
});
