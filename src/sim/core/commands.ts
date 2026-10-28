/**
 * Per-tick player input as data. Movement is quantized to integers so that
 * recorded logs replay bit-identically (a touch joystick can map to -127..127 later).
 */
export interface PlayerCommand {
  moveX: number; // -1, 0, 1
  moveY: number; // -1, 0, 1
  ability1: boolean;
  ability2: boolean;
  dodge: boolean;
}

export const IDLE_COMMAND: Readonly<PlayerCommand> = Object.freeze({
  moveX: 0,
  moveY: 0,
  ability1: false,
  ability2: false,
  dodge: false,
});

export function commandsEqual(a: PlayerCommand, b: PlayerCommand): boolean {
  return (
    a.moveX === b.moveX &&
    a.moveY === b.moveY &&
    a.ability1 === b.ability1 &&
    a.ability2 === b.ability2 &&
    a.dodge === b.dodge
  );
}

/** Compact run recording: only ticks where the command changed are stored. */
export interface InputLog {
  seed: number;
  entries: { tick: number; cmd: PlayerCommand }[];
}

export class InputRecorder {
  readonly log: InputLog;
  private last: PlayerCommand = IDLE_COMMAND;

  constructor(seed: number) {
    this.log = { seed, entries: [] };
  }

  record(tick: number, cmd: PlayerCommand): void {
    if (commandsEqual(cmd, this.last)) return;
    this.last = { ...cmd };
    this.log.entries.push({ tick, cmd: this.last });
  }
}

/** Replays an InputLog tick by tick. */
export class InputPlayback {
  private idx = 0;
  private current: PlayerCommand = IDLE_COMMAND;

  constructor(private readonly log: InputLog) {}

  commandFor(tick: number): PlayerCommand {
    while (this.idx < this.log.entries.length && this.log.entries[this.idx]!.tick <= tick) {
      this.current = this.log.entries[this.idx]!.cmd;
      this.idx++;
    }
    return this.current;
  }
}
