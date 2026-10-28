export const ABILITIES = {
  /** Q — ground slam: damage + stun + knockback around the Vanguard. */
  seismicSlam: {
    id: 'seismicSlam',
    cooldown: 7,
    damage: 45,
    radius: 190,
    stunSeconds: 1.2,
    knockback: 520,
  },
  /** E — holy bulwark: damage reduction + damaging pulses for a short time. */
  guardiansWrath: {
    id: 'guardiansWrath',
    cooldown: 14,
    duration: 5,
    damageReduction: 0.45,
    pulseInterval: 0.5,
    pulseDamage: 14,
    pulseRadius: 155,
    pulseKnockback: 140,
  },
} as const;

export type AbilityId = keyof typeof ABILITIES;
