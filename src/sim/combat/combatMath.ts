import type { Rng } from '../core/rng';
import { STAT_IDS, type StatBlock, type StatCap, type StatId, type StatModifier } from './stats';

/** Single source of truth for stacking, caps and damage formulas. See BALANCE.md. */
export interface CombatRules {
  caps: Record<StatId, StatCap>;
  /** Armor mitigation = armor / (armor + armorK). */
  armorK: number;
  /** Upper bound on combined mitigation (armor x DR x temporary reductions). */
  maxTotalMitigation: number;
  /** Any hit with positive raw damage deals at least this much. */
  minDamage: number;
  /** Cooldowns never drop below this many seconds. */
  minCooldown: number;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** flat -> additive % -> multiplicative, then clamp to the stat's cap. */
export function computeStat(
  stat: StatId,
  base: number,
  mods: readonly StatModifier[],
  rules: CombatRules,
): number {
  let flat = 0;
  let addPct = 0;
  let mult = 1;
  for (const m of mods) {
    if (m.stat !== stat) continue;
    if (m.kind === 'flat') flat += m.value;
    else if (m.kind === 'addPct') addPct += m.value;
    else mult *= 1 + m.value;
  }
  const value = (base + flat) * Math.max(0, 1 + addPct) * Math.max(0, mult);
  const cap = rules.caps[stat];
  return clamp(value, cap.min, cap.max);
}

export function computeStats(base: StatBlock, mods: readonly StatModifier[], rules: CombatRules): StatBlock {
  const out = {} as StatBlock;
  for (const id of STAT_IDS) out[id] = computeStat(id, base[id], mods, rules);
  return out;
}

export interface DamageRoll {
  amount: number;
  crit: boolean;
}

/** Outgoing damage: base x damage multiplier, crit roll consumes exactly one rng value. */
export function rollDamage(baseDamage: number, attacker: StatBlock, rng: Rng): DamageRoll {
  const crit = rng.next() < attacker.critChance;
  const amount = baseDamage * attacker.damage * (crit ? attacker.critDamage : 1);
  return { amount, crit };
}

export function armorMitigation(armor: number, rules: CombatRules): number {
  const a = Math.max(0, armor);
  return a / (a + rules.armorK);
}

/**
 * Incoming damage after armor, damage reduction and temporary reductions
 * (e.g. Guardian's Wrath). Layers combine multiplicatively; total is capped.
 */
export function mitigate(
  raw: number,
  defender: Pick<StatBlock, 'armor' | 'damageReduction'>,
  rules: CombatRules,
  extraReductions: readonly number[] = [],
): number {
  if (raw <= 0) return 0;
  let taken = (1 - armorMitigation(defender.armor, rules)) * (1 - defender.damageReduction);
  for (const r of extraReductions) taken *= 1 - clamp(r, 0, 1);
  const mitigation = Math.min(1 - taken, rules.maxTotalMitigation);
  return Math.max(rules.minDamage, raw * (1 - mitigation));
}

export function effectiveCooldown(baseSeconds: number, stats: StatBlock, rules: CombatRules): number {
  return Math.max(rules.minCooldown, baseSeconds * (1 - stats.cooldownReduction));
}

/** Auto-weapon interval: attack speed is a rate multiplier. */
export function attackInterval(baseSeconds: number, stats: StatBlock, rules: CombatRules): number {
  return Math.max(rules.minCooldown, baseSeconds / stats.attackSpeed);
}

export function scaledRadius(baseRadius: number, stats: StatBlock): number {
  return baseRadius * stats.area;
}

export function lifeStealHeal(damageDealt: number, stats: StatBlock): number {
  return damageDealt * stats.lifeSteal * stats.healing;
}
