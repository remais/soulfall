import type { PlayerCommand } from '../sim/core/commands';
import { KEYBINDS, type GameAction } from './keybinds';

export interface InputSource {
  /** Called once per sim tick. Must be cheap and side-effect free apart from clearing latches. */
  sample(): PlayerCommand;
  destroy(): void;
}

/**
 * Keyboard -> PlayerCommand. Keys pressed and released between two ticks are
 * latched so short taps are never lost.
 */
export class KeyboardInput implements InputSource {
  private readonly down = new Set<GameAction>();
  private readonly latched = new Set<GameAction>();
  private readonly codeToAction = new Map<string, GameAction>();

  constructor(private readonly target: Window = window) {
    for (const [action, codes] of Object.entries(KEYBINDS) as [GameAction, string[]][]) {
      for (const code of codes) this.codeToAction.set(code, action);
    }
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
    target.addEventListener('blur', this.onBlur);
  }

  private readonly onDown = (e: KeyboardEvent): void => {
    const action = this.codeToAction.get(e.code);
    if (!action) return;
    e.preventDefault();
    this.down.add(action);
    this.latched.add(action);
  };

  private readonly onUp = (e: KeyboardEvent): void => {
    const action = this.codeToAction.get(e.code);
    if (action) this.down.delete(action);
  };

  private readonly onBlur = (): void => {
    this.down.clear();
    this.latched.clear();
  };

  private active(a: GameAction): boolean {
    return this.down.has(a) || this.latched.has(a);
  }

  sample(): PlayerCommand {
    const cmd: PlayerCommand = {
      moveX: (this.active('right') ? 1 : 0) - (this.active('left') ? 1 : 0),
      moveY: (this.active('down') ? 1 : 0) - (this.active('up') ? 1 : 0),
      ability1: this.active('ability1'),
      ability2: this.active('ability2'),
      dodge: this.active('dodge'),
    };
    this.latched.clear();
    return cmd;
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}
