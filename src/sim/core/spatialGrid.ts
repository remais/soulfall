/**
 * Uniform grid broadphase over a bounded arena. Allocation-free: rebuilt every
 * tick with linked lists in typed arrays.
 */
export class SpatialGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly head: Int32Array;
  private readonly next: Int32Array;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly cellSize: number,
    capacity: number,
  ) {
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.head = new Int32Array(this.cols * this.rows).fill(-1);
    this.next = new Int32Array(capacity).fill(-1);
  }

  clear(): void {
    this.head.fill(-1);
  }

  private cellIndex(x: number, y: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellSize)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellSize)));
    return cy * this.cols + cx;
  }

  insert(index: number, x: number, y: number): void {
    const c = this.cellIndex(x, y);
    this.next[index] = this.head[c]!;
    this.head[c] = index;
  }

  /**
   * Collects indices in cells overlapping the circle's bounding box into `out`
   * (cleared first). Callers do the exact distance test.
   */
  query(x: number, y: number, radius: number, out: number[]): number[] {
    out.length = 0;
    const cs = this.cellSize;
    const x0 = Math.max(0, Math.floor((x - radius) / cs));
    const y0 = Math.max(0, Math.floor((y - radius) / cs));
    const x1 = Math.min(this.cols - 1, Math.floor((x + radius) / cs));
    const y1 = Math.min(this.rows - 1, Math.floor((y + radius) / cs));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        let i = this.head[cy * this.cols + cx]!;
        while (i !== -1) {
          out.push(i);
          i = this.next[i]!;
        }
      }
    }
    return out;
  }
}
