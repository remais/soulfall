/** Default keybinds (KeyboardEvent.code). Remapping UI comes later; edit here for now. */
export type GameAction = 'up' | 'down' | 'left' | 'right' | 'ability1' | 'ability2' | 'dodge';

export const KEYBINDS: Record<GameAction, string[]> = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  ability1: ['KeyQ'],
  ability2: ['KeyE'],
  dodge: ['Space'],
};
