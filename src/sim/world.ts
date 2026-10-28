import type { ArenaDef } from '../data/arena';
import type { ClassId } from '../data/classes';
import type { EnemyId } from '../data/enemies';
import type { StatBlock, StatModifier } from './combat/stats';
import type { PlayerCommand } from './core/commands';
import type { SimEvent } from './core/events';
import type { Rng } from './core/rng';
import type { SpatialGrid } from './core/spatialGrid';

export interface Player {
  id: number;
  classId: ClassId;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** Unit vector of last movement / aim. */
  facingX: number;
  facingY: number;
  radius: number;
  hp: number;
  alive: boolean;
  modifiers: StatModifier[];
  stats: StatBlock;
  moving: boolean;
  dodgeTimer: number;
  dodgeCooldown: number;
  dodgeDirX: number;
  dodgeDirY: number;
  iframes: number;
  weaponTimer: number;
  ability1Cooldown: number;
  ability2Cooldown: number;
  wrathTimer: number;
  wrathPulseTimer: number;
  wrathPulsesLeft: number;
  /** Debug only: ignore damage. */
  invulnerable: boolean;
  cmd: PlayerCommand;
}

export type EnemyState = 'chase' | 'windup' | 'recover';

/** Enemies live in a fixed-capacity pool; `slot` is stable while active. */
export interface Enemy {
  slot: number;
  id: number;
  active: boolean;
  defId: EnemyId;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  kbX: number;
  kbY: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  mass: number;
  stun: number;
  state: EnemyState;
  stateTimer: number;
  attackCooldown: number;
  targetPlayer: number;
}

export type RunState = 'running' | 'defeat';

export interface RunStats {
  kills: number;
  damageDealt: number;
  damageTaken: number;
}

export interface World {
  seed: number;
  tick: number;
  dt: number;
  rng: Rng;
  arena: ArenaDef;
  players: Player[];
  enemies: Enemy[];
  activeEnemies: number;
  grid: SpatialGrid;
  nextId: number;
  state: RunState;
  /** Tick at which the run ended (defeat), or null while running. */
  endTick: number | null;
  stats: RunStats;
  spawnAccumulator: number;
  nextSurgeAt: number;
  events: SimEvent[];
}

export function elapsedSeconds(world: World): number {
  return world.tick * world.dt;
}

/** Run time as the player sees it: frozen once the run has ended. */
export function runSeconds(world: World): number {
  return (world.endTick ?? world.tick) * world.dt;
}
