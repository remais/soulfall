import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../../src/data/abilities';
import { CLASSES } from '../../src/data/classes';
import { ENEMIES } from '../../src/data/enemies';
import { WEAPONS } from '../../src/data/weapons';
import { IDLE_COMMAND, InputPlayback, InputRecorder, type PlayerCommand } from '../../src/sim/core/commands';
import { spawnEnemy } from '../../src/sim/enemies/enemySystem';
import { Simulation } from '../../src/sim/simulation';

const TICK = 60;
const cmd = (c: Partial<PlayerCommand>): PlayerCommand => ({ ...IDLE_COMMAND, ...c });

function run(sim: Simulation, ticks: number, c: PlayerCommand = IDLE_COMMAND): void {
  for (let i = 0; i < ticks; i++) sim.step([c]);
}

/** Pseudo-random but fixed input script. */
function scriptedCommand(tick: number): PlayerCommand {
  const phase = Math.floor(tick / 45) % 8;
  return {
    moveX: [1, 1, 0, -1, -1, -1, 0, 1][phase]!,
    moveY: [0, 1, 1, 1, 0, -1, -1, -1][phase]!,
    ability1: tick % 400 === 200,
    ability2: tick % 900 === 450,
    dodge: tick % 150 === 75,
  };
}

describe('determinism', () => {
  it('same seed + same inputs => identical state hash', () => {
    const a = new Simulation({ seed: 2026 });
    const b = new Simulation({ seed: 2026 });
    for (let t = 0; t < 60 * TICK; t++) {
      a.step([scriptedCommand(t)]);
      b.step([scriptedCommand(t)]);
    }
    expect(a.world.stats.kills).toBeGreaterThan(0);
    expect(a.stateHash()).toBe(b.stateHash());
  });

  it('a recorded input log replays to the same result', () => {
    const live = new Simulation({ seed: 77 });
    const rec = new InputRecorder(77);
    for (let t = 0; t < 30 * TICK; t++) {
      const c = scriptedCommand(t);
      rec.record(live.world.tick, c);
      live.step([c]);
    }
    const replay = new Simulation({ seed: rec.log.seed });
    const play = new InputPlayback(rec.log);
    for (let t = 0; t < 30 * TICK; t++) replay.step([play.commandFor(replay.world.tick)]);
    expect(replay.stateHash()).toBe(live.stateHash());
  });

  it('different seeds diverge', () => {
    const a = new Simulation({ seed: 1 });
    const b = new Simulation({ seed: 2 });
    run(a, 20 * TICK);
    run(b, 20 * TICK);
    expect(a.stateHash()).not.toBe(b.stateHash());
  });
});

describe('player', () => {
  it('moves at moveSpeed and normalizes diagonals', () => {
    const sim = new Simulation({ seed: 1, spawning: false });
    const p = sim.player;
    const x0 = p.x;
    run(sim, TICK, cmd({ moveX: 1 }));
    expect(p.x - x0).toBeCloseTo(p.stats.moveSpeed, 5);

    const sim2 = new Simulation({ seed: 1, spawning: false });
    const q = sim2.player;
    const [qx, qy] = [q.x, q.y];
    run(sim2, 30, cmd({ moveX: -1, moveY: -1 }));
    expect(Math.hypot(q.x - qx, q.y - qy)).toBeCloseTo(q.stats.moveSpeed * 0.5, 5);
  });

  it('cannot walk through obstacles or leave the arena', () => {
    const sim = new Simulation({ seed: 1, spawning: false });
    run(sim, 30 * TICK, cmd({ moveX: -1, moveY: -1 }));
    const p = sim.player;
    expect(p.x).toBeGreaterThanOrEqual(p.radius);
    expect(p.y).toBeGreaterThanOrEqual(p.radius);
    for (const o of sim.world.arena.obstacles) {
      expect(Math.hypot(p.x - o.x, p.y - o.y)).toBeGreaterThanOrEqual(o.r + p.radius - 1e-6);
    }
  });

  it('dodge dashes, grants iframes and respects its cooldown', () => {
    const sim = new Simulation({ seed: 1, spawning: false });
    const p = sim.player;
    const dodge = CLASSES.vanguard.dodge;
    const x0 = p.x;
    sim.step([cmd({ moveX: 1, dodge: true })]);
    expect(p.iframes).toBeGreaterThan(0);
    expect(p.dodgeCooldown).toBeCloseTo(dodge.cooldown, 5);
    run(sim, Math.round(dodge.duration * TICK), cmd({ moveX: 1 }));
    expect(p.x - x0).toBeGreaterThan(p.stats.moveSpeed * dodge.speedMult * dodge.duration * 0.9);

    // Held dodge does not re-trigger until the cooldown expires.
    sim.drainEvents();
    const events: string[] = [];
    for (let i = 0; i < dodge.cooldown * TICK - 30; i++) {
      sim.step([cmd({ dodge: true })]);
      events.push(...sim.drainEvents().map((e) => e.type));
    }
    expect(events.filter((t) => t === 'dodge')).toHaveLength(0);
    run(sim, 40, cmd({ dodge: true }));
    expect(sim.drainEvents().some((e) => e.type === 'dodge')).toBe(true);
  });

  it('takes no damage while dodging', () => {
    const sim = new Simulation({ seed: 1, spawning: false });
    const p = sim.player;
    p.iframes = 10;
    spawnEnemy(sim.world, 'riftHusk', p.x + 30, p.y);
    run(sim, 3 * TICK);
    expect(p.hp).toBe(p.stats.maxHealth);
  });
});

describe('sword cleave', () => {
  it('auto-attacks a nearby enemy for weapon damage', () => {
    const sim = new Simulation({ seed: 5, spawning: false });
    const p = sim.player;
    p.stats.critChance = 0;
    const e = spawnEnemy(sim.world, 'riftHusk', p.x + 80, p.y)!;
    sim.step([IDLE_COMMAND]);
    const ev = sim.drainEvents();
    expect(ev.some((x) => x.type === 'swing')).toBe(true);
    expect(e.hp).toBeCloseTo(ENEMIES.riftHusk.maxHealth - WEAPONS.heavySword.damage * p.stats.damage, 5);
  });

  it('does not swing with nothing in range, and hits only inside the arc', () => {
    const sim = new Simulation({ seed: 5, spawning: false });
    const p = sim.player;
    spawnEnemy(sim.world, 'riftHusk', p.x + 600, p.y);
    sim.step([IDLE_COMMAND]);
    expect(sim.drainEvents().some((x) => x.type === 'swing')).toBe(false);

    const front = spawnEnemy(sim.world, 'riftHusk', p.x + 90, p.y)!;
    const behind = spawnEnemy(sim.world, 'riftHusk', p.x - 110, p.y)!;
    sim.step([IDLE_COMMAND]);
    expect(front.hp).toBeLessThan(front.maxHp);
    expect(behind.hp).toBe(behind.maxHp);
  });

  it('swings again only after the attack interval', () => {
    const sim = new Simulation({ seed: 5, spawning: false });
    const p = sim.player;
    const e = spawnEnemy(sim.world, 'riftHusk', p.x + 80, p.y)!;
    e.hp = e.maxHp = 1e6;
    let swings = 0;
    for (let i = 0; i < 3 * TICK; i++) {
      sim.step([IDLE_COMMAND]);
      swings += sim.drainEvents().filter((x) => x.type === 'swing').length;
    }
    expect(swings).toBe(Math.ceil(3 / WEAPONS.heavySword.cooldown));
  });
});

describe('Vanguard abilities', () => {
  it('Seismic Slam damages and stuns everything in radius, then goes on cooldown', () => {
    const sim = new Simulation({ seed: 9, spawning: false });
    const p = sim.player;
    p.stats.critChance = 0;
    p.weaponTimer = 999; // isolate the ability from the sword
    const near = spawnEnemy(sim.world, 'riftHusk', p.x, p.y + 150)!;
    const far = spawnEnemy(sim.world, 'riftHusk', p.x, p.y + 400)!;
    near.hp = near.maxHp = 1000;
    sim.step([cmd({ ability1: true })]);
    expect(near.hp).toBeCloseTo(1000 - ABILITIES.seismicSlam.damage, 5);
    expect(near.stun).toBeGreaterThan(1);
    expect(far.hp).toBe(far.maxHp);
    expect(p.ability1Cooldown).toBeCloseTo(ABILITIES.seismicSlam.cooldown, 5);

    sim.step([cmd({ ability1: true })]);
    expect(near.hp).toBeCloseTo(1000 - ABILITIES.seismicSlam.damage, 5);

    run(sim, ABILITIES.seismicSlam.cooldown * TICK);
    sim.step([cmd({ ability1: true })]);
    expect(near.hp).toBeLessThan(1000 - ABILITIES.seismicSlam.damage);
  });

  it("Guardian's Wrath reduces damage taken and pulses for its duration", () => {
    const sim = new Simulation({ seed: 9, spawning: false });
    const p = sim.player;
    p.weaponTimer = 1e9;
    sim.step([cmd({ ability2: true })]);
    expect(p.wrathTimer).toBeGreaterThan(0);
    expect(p.ability2Cooldown).toBeCloseTo(ABILITIES.guardiansWrath.cooldown, 5);

    const e = spawnEnemy(sim.world, 'riftHusk', p.x + 60, p.y)!;
    e.hp = e.maxHp = 1e6;
    let pulses = 0;
    for (let i = 0; i < ABILITIES.guardiansWrath.duration * TICK + 30; i++) {
      p.weaponTimer = 1e9;
      sim.step([IDLE_COMMAND]);
      pulses += sim.drainEvents().filter((x) => x.type === 'wrathPulse').length;
    }
    const expected = Math.round(ABILITIES.guardiansWrath.duration / ABILITIES.guardiansWrath.pulseInterval);
    expect(pulses).toBeGreaterThanOrEqual(expected - 1);
    expect(pulses).toBeLessThanOrEqual(expected);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(p.wrathTimer).toBe(0);
  });

  it("Guardian's Wrath mitigation applies to enemy hits", () => {
    const hitTaken = (wrath: boolean): number => {
      const sim = new Simulation({ seed: 3, spawning: false });
      const p = sim.player;
      p.weaponTimer = 1e9;
      if (wrath) sim.step([cmd({ ability2: true })]);
      const e = spawnEnemy(sim.world, 'riftHusk', p.x + 35, p.y)!;
      e.hp = e.maxHp = 1e9;
      const hp0 = p.hp;
      for (let i = 0; i < TICK && p.hp === hp0; i++) {
        p.weaponTimer = 1e9;
        sim.step([IDLE_COMMAND]);
      }
      return hp0 - p.hp;
    };
    const plain = hitTaken(false);
    const shielded = hitTaken(true);
    expect(plain).toBeGreaterThan(0);
    expect(shielded).toBeCloseTo(plain * (1 - ABILITIES.guardiansWrath.damageReduction), 5);
  });
});

describe('enemies', () => {
  it('chase the player', () => {
    const sim = new Simulation({ seed: 1, spawning: false });
    const p = sim.player;
    const e = spawnEnemy(sim.world, 'riftHusk', p.x + 500, p.y)!;
    const d0 = Math.hypot(e.x - p.x, e.y - p.y);
    run(sim, TICK);
    expect(d0 - Math.hypot(e.x - p.x, e.y - p.y)).toBeCloseTo(ENEMIES.riftHusk.speed, 0);
  });

  it('telegraph before hitting and deal damage after the windup', () => {
    const sim = new Simulation({ seed: 1, spawning: false });
    const p = sim.player;
    p.weaponTimer = 1e9;
    const e = spawnEnemy(sim.world, 'riftHusk', p.x + 35, p.y)!;
    e.hp = 1e9;
    sim.step([IDLE_COMMAND]);
    expect(sim.drainEvents().some((x) => x.type === 'enemyWindup')).toBe(true);
    expect(p.hp).toBe(p.stats.maxHealth);
    for (let i = 0; i < ENEMIES.riftHusk.windup * TICK + 2; i++) {
      p.weaponTimer = 1e9;
      sim.step([IDLE_COMMAND]);
    }
    expect(p.hp).toBeLessThan(p.stats.maxHealth);
  });

  it('a dodge out of range during windup avoids the hit', () => {
    const sim = new Simulation({ seed: 1, spawning: false });
    const p = sim.player;
    p.weaponTimer = 1e9;
    const e = spawnEnemy(sim.world, 'riftHusk', p.x + 35, p.y)!;
    e.hp = 1e9;
    e.speed = 0;
    sim.step([IDLE_COMMAND]);
    sim.step([cmd({ moveX: -1, dodge: true })]);
    for (let i = 0; i < TICK; i++) {
      p.weaponTimer = 1e9;
      sim.step([cmd({ moveX: -1 })]);
    }
    expect(p.hp).toBe(p.stats.maxHealth);
  });

  it('player dies and the run ends in defeat', () => {
    const sim = new Simulation({ seed: 1, spawning: false });
    const p = sim.player;
    p.hp = 1;
    p.weaponTimer = 1e9;
    spawnEnemy(sim.world, 'riftHusk', p.x + 35, p.y)!.hp = 1e9;
    for (let i = 0; i < 2 * TICK; i++) {
      p.weaponTimer = 1e9;
      sim.step([IDLE_COMMAND]);
    }
    expect(p.alive).toBe(false);
    expect(sim.world.state).toBe('defeat');
    expect(sim.world.endTick).not.toBeNull();
    const end = sim.world.endTick;
    run(sim, 30);
    expect(sim.world.endTick).toBe(end);
  });

  it('enemies do not stack on top of each other', () => {
    const sim = new Simulation({ seed: 1, spawning: false });
    const p = sim.player;
    p.invulnerable = true;
    p.weaponTimer = 1e9;
    for (let i = 0; i < 40; i++) spawnEnemy(sim.world, 'riftHusk', p.x + 300, p.y + (i % 2));
    for (let i = 0; i < 3 * TICK; i++) {
      p.weaponTimer = 1e9;
      sim.step([IDLE_COMMAND]);
    }
    const act = sim.world.enemies.filter((e) => e.active);
    let overlaps = 0;
    for (let i = 0; i < act.length; i++)
      for (let j = i + 1; j < act.length; j++)
        if (Math.hypot(act[i]!.x - act[j]!.x, act[i]!.y - act[j]!.y) < act[i]!.radius * 0.8) overlaps++;
    expect(overlaps).toBe(0);
  });
});

describe('director', () => {
  it('spawns enemies over time, more later, and a surge', () => {
    const sim = new Simulation({ seed: 11 });
    sim.player.invulnerable = true;
    let surge = false;
    for (let i = 0; i < 35 * TICK; i++) {
      sim.step([IDLE_COMMAND]);
      if (sim.drainEvents().some((e) => e.type === 'surge')) surge = true;
    }
    expect(surge).toBe(true);
    expect(sim.world.stats.kills + sim.world.activeEnemies).toBeGreaterThan(40);
  });

  it('handles 300+ enemies within a frame budget', () => {
    const sim = new Simulation({ seed: 4, spawning: false });
    sim.player.invulnerable = true;
    sim.debugSpawn(350, 200, 1000);
    expect(sim.world.activeEnemies).toBe(350);
    const t0 = performance.now();
    run(sim, 300, cmd({ moveX: 1 }));
    const msPerTick = (performance.now() - t0) / 300;
    // Generous bound for CI noise; real numbers are reported in PROGRESS.md.
    expect(msPerTick).toBeLessThan(4);
  });
});
