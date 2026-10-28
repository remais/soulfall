/**
 * Fixed-timestep accumulator. The renderer calls advance() every frame with
 * the real elapsed time; the simulation always steps in fixed increments.
 */
export class FixedStepLoop {
  private acc = 0;

  constructor(
    readonly stepMs: number,
    private readonly maxStepsPerFrame = 5,
  ) {}

  /** Runs zero or more fixed steps. Returns interpolation alpha in [0, 1). */
  advance(frameMs: number, step: () => void): number {
    this.acc += Math.max(0, Math.min(frameMs, this.stepMs * this.maxStepsPerFrame));
    let steps = 0;
    while (this.acc >= this.stepMs && steps < this.maxStepsPerFrame) {
      step();
      this.acc -= this.stepMs;
      steps++;
    }
    // Drop backlog instead of spiralling (e.g. after a tab was hidden).
    if (this.acc >= this.stepMs) this.acc = 0;
    return this.acc / this.stepMs;
  }

  reset(): void {
    this.acc = 0;
  }
}
