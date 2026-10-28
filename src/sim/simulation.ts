import { ARENAS, type ArenaId } from '../data/arena';
import { CLASSES, type ClassId } from '../data/classes';
import { BASE_STATS, COMBAT_RULES } from '../data/combatRules';
import { DIRECTOR } from '../data/director';
import { SIM_CONFIG } from '../data/game';
import { WEAPONS } from '../data/weapons';
import { updateVanguardAbilities } from './abilities/vanguardAbilities';
import { computeStats } from './combat/combatMath';
import { killEnemy } from './combat/damage';
import { IDLE_COMMAND, type PlayerCommand } from './core/commands';
import type { SimEvent } from './core/events';
import { Rng } from './core/rng';
import { SpatialGrid } from './core/spatialGrid';
import { updateDirector } from './director/director';
import { createEnemyPool, rebuildGrid, spawnEnemy, updateEnemies } from './enemies/enemySystem';
import { updatePlayers } from './player/playerSystem';
import { updateMeleeCleave } from './weapons/meleeCleave';
import type { Player, World } from './world';

export interface SimOptions {
  seed: number;
  arena?: ArenaId;
  classId?: ClassId;
  /** Disable the wave director (tests, sandbox). */
  spawning?: boolean;
}

function createPlayer(id: number, classId: ClassId, x: number, y: number): Player {
  const cls = CLASSES[classId];
  const modifiers = [...cls.baseModifiers];
  const stats = computeStats(BASE_STATS, modifiers, COMBAT_RULES);
  return {
    id,
    classId,
    x,
    y,
    prevX: x,
    prevY: y,
    facingX: 1,
    facingY: 0,
    radius: cls.radius,
    hp: stats.maxHealth,
    alive: true,
    modifiers,
    stats,
    moving: false,
    dodgeTimer: 0,
    dodgeCooldown: 0,
    dodgeDirX: 1,
    dodgeDirY: 0,
    iframes: 0,
    weaponTimer: 0,
    ability1Cooldown: 0,
    ability2Cooldown: 0,
    wrathTimer: 0,
    wrathPulseTimer: 0,
    wrathPulsesLeft: 0,
    invulnerable: false,
    cmd: { ...IDLE_COMMAND },
  };
}

/**
 * Deterministic, renderer-free game simulation. Advance it with step(commands)
 * at a fixed tick rate; read world state and drained events to render.
 */
export class Simulation {
  readonly world: World;
  private readonly spawning: boolean;
  private pendingEvents: SimEvent[] = [];

  constructor(opts: SimOptions) {
    const arena = ARENAS[opts.arena ?? 'shatteredSanctum'];
    const classId = opts.classId ?? 'vanguard';
    this.spawning = opts.spawning ?? true;
    this.world = {
      seed: opts.seed,
      tick: 0,
      dt: 1 / SIM_CONFIG.tickRate,
      rng: new Rng(opts.seed),
      arena,
      players: [createPlayer(1, classId, arena.spawnPoint.x, arena.spawnPoint.y)],
      enemies: createEnemyPool(SIM_CONFIG.maxEnemies),
      activeEnemies: 0,
      grid: new SpatialGrid(arena.width, arena.height, SIM_CONFIG.gridCellSize, SIM_CONFIG.maxEnemies),
      nextId: 100,
      state: 'running',
      endTick: null,
      stats: { kills: 0, damageDealt: 0, damageTaken: 0 },
      spawnAccumulator: 0,
      nextSurgeAt: DIRECTOR.surgeFirstAt,
      events: [],
    };
  }

  get player(): Player {
    return this.world.players[0]!;
  }

  /** Advances one fixed tick. `commands[i]` drives `world.players[i]`. */
  step(commands: readonly PlayerCommand[]): void {
    const w = this.world;
    w.events = this.pendingEvents;

    w.players.forEach((p, i) => {
      p.cmd = commands[i] ?? IDLE_COMMAND;
    });

    updatePlayers(w);
    if (this.spawning && w.state === 'running') updateDirector(w);
    updateEnemies(w);
    rebuildGrid(w);

    for (const p of w.players) {
      if (!p.alive) continue;
      updateMeleeCleave(w, p, WEAPONS[CLASSES[p.classId].startingWeapon]);
      updateVanguardAbilities(w, p);
    }

    if (w.state === 'running' && w.players.every((p) => !p.alive)) {
      w.state = 'defeat';
      w.endTick = w.tick;
    }
    w.tick++;
  }

  /** Returns and clears all events emitted since the last drain. */
  drainEvents(): SimEvent[] {
    const out = this.pendingEvents;
    this.pendingEvents = [];
    this.world.events = this.pendingEvents;
    return out;
  }

  // --- Debug / test helpers (also used by the dev-only debug overlay) ---

  debugSpawn(count: number, minDist = 300, maxDist = 700): void {
    const p = this.player;
    for (let i = 0; i < count; i++) {
      const a = this.world.rng.range(0, Math.PI * 2);
      const d = this.world.rng.range(minDist, maxDist);
      spawnEnemy(this.world, 'riftHusk', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
    }
  }

  debugKillAll(): void {
    for (const e of this.world.enemies) if (e.active) killEnemy(this.world, e);
  }

  debugHeal(): void {
    const p = this.player;
    p.hp = p.stats.maxHealth;
  }

  debugResetCooldowns(): void {
    const p = this.player;
    p.ability1Cooldown = p.ability2Cooldown = p.dodgeCooldown = 0;
  }

  /** Stable hash of the full gameplay state (determinism tests, replay verification). */
  stateHash(): string {
    const w = this.world;
    const nums: number[] = [w.tick, w.rng.state, w.activeEnemies, w.stats.kills, w.nextId];
    for (const p of w.players)
      nums.push(p.x, p.y, p.hp, p.ability1Cooldown, p.ability2Cooldown, p.weaponTimer);
    for (const e of w.enemies) if (e.active) nums.push(e.slot, e.id, e.x, e.y, e.hp, e.stateTimer);
    const view = new DataView(new Float64Array(nums).buffer);
    let h = 0x811c9dc5;
    for (let i = 0; i < view.byteLength; i++) {
      h ^= view.getUint8(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
}
