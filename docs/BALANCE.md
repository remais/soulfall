# Balance

All numbers live in `src/data/`. All formulas live in `src/sim/combat/combatMath.ts` (unit-tested in `tests/unit/combatMath.test.ts`).

## Stat stacking

```
value = (base + Σflat) × max(0, 1 + ΣaddPct) × Π(1 + mult_i)
value = clamp(value, cap.min, cap.max)
```

Multiplier stats use 1 = 100% (damage, attackSpeed, area, xpGain, healing, projectileSpeed, statusDuration).

## Caps (`data/combatRules.ts`)

| Stat | Min | Max |
|---|---|---|
| damage | 0.1 | 50 |
| attackSpeed | 0.2 | 4 |
| critChance | 0 | 1 |
| critDamage | 1 | 10 |
| armor | 0 | 2000 |
| damageReduction | 0 | 0.6 |
| cooldownReduction | 0 | 0.6 |
| moveSpeed | 40 | 520 |
| area | 0.3 | 4 |
| lifeSteal | 0 | 0.25 |
| projectileCount | 0 | 20 |
| (others) | see file | |

Total mitigation cap: **85%**. Minimum damage per positive hit: **1**. Minimum cooldown: **0.1 s**.

## Formulas

| What | Formula |
|---|---|
| Outgoing hit | `base × damage × (crit ? critDamage : 1)`; one RNG roll per hit |
| Armor | `armor / (armor + 100)` |
| Incoming hit | `raw × (1−armorMit) × (1−DR) × Π(1−temp)`, mitigation capped at 85%, min 1 |
| Ability cooldown | `max(0.1, base × (1 − CDR))` |
| Auto-weapon interval | `max(0.1, base / attackSpeed)` |
| AoE radius | `base × area` |
| Life steal heal | `dealt × lifeSteal × healing` |

## Vanguard (Phase 1A)

| | Value |
|---|---|
| Max HP | 150 (100 base + 50) |
| Armor | 20 → 16.7% mitigation |
| Move speed | 210 px/s |
| Dodge | 0.18 s dash at 3.6× speed, 0.28 s i-frames, 1.4 s cooldown |
| Hurt i-frames | 0.25 s after any hit |
| Heavy Sword | 22 dmg, 150° arc, 125 px range, 1.0 s, knockback 260, auto-aims within 230 px |
| Seismic Slam (Q) | 45 dmg, 190 px radius, 1.2 s stun, knockback 520, 7 s cooldown |
| Guardian's Wrath (E) | 5 s: −45% damage taken + 10 pulses (every 0.5 s) of 14 dmg in 155 px, 14 s cooldown |

## Rift Husk

34 HP (× 1 + 0.14/min), 92 px/s, 10 dmg melee after a 0.45 s red telegraph, 1.2 s attack cooldown.

## Director (endless prototype)

Spawn rate `0.9 + 1.4/min` per second (max 9/s), max 450 alive, spawn ring 640–860 px from the player. Surge ring of `22 + 6/min` enemies every 40 s from 0:30.
