/** Working title — rename here only (see DECISIONS.md, title is an open decision). */
export const GAME_TITLE = 'Riftbound: Soulfall';
export const GAME_VERSION = '0.1.0-phase1a';

export const SIM_CONFIG = {
  tickRate: 60,
  /** Max fixed steps per rendered frame before the backlog is dropped. */
  maxStepsPerFrame: 5,
  maxEnemies: 600,
  gridCellSize: 64,
} as const;
