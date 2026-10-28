/** Events the simulation emits for the renderer/audio. The sim never reads them back. */
export type SimEvent =
  | { type: 'swing'; playerId: number; x: number; y: number; angle: number; arc: number; range: number }
  | { type: 'enemyDamaged'; slot: number; x: number; y: number; amount: number; crit: boolean }
  | { type: 'enemyDied'; slot: number; x: number; y: number }
  | { type: 'enemyWindup'; slot: number }
  | { type: 'playerDamaged'; playerId: number; amount: number }
  | { type: 'playerDied'; playerId: number }
  | { type: 'dodge'; playerId: number; dirX: number; dirY: number }
  | { type: 'slam'; playerId: number; x: number; y: number; radius: number }
  | { type: 'wrathStart'; playerId: number }
  | { type: 'wrathPulse'; playerId: number; x: number; y: number; radius: number }
  | { type: 'wrathEnd'; playerId: number }
  | { type: 'surge' };
