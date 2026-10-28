import { describe, expect, it } from 'vitest';
import { InputPlayback, InputRecorder, IDLE_COMMAND } from '../../src/sim/core/commands';
import { FixedStepLoop } from '../../src/sim/core/loop';
import { hashString, Rng } from '../../src/sim/core/rng';
import { SpatialGrid } from '../../src/sim/core/spatialGrid';

describe('Rng', () => {
  it('is reproducible for the same seed', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 1000; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('differs between seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const same = Array.from({ length: 50 }, () => a.next() === b.next()).filter(Boolean).length;
    expect(same).toBeLessThan(3);
  });

  it('stays in range', () => {
    const r = new Rng(7);
    for (let i = 0; i < 5000; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
    }
  });

  it('state can be saved and restored', () => {
    const r = new Rng(99);
    r.next();
    const saved = r.state;
    const x = r.next();
    r.state = saved;
    expect(r.next()).toBe(x);
  });

  it('hashString is stable', () => {
    expect(hashString('2026-10-28')).toBe(hashString('2026-10-28'));
    expect(hashString('2026-10-28')).not.toBe(hashString('2026-10-29'));
  });
});

describe('FixedStepLoop', () => {
  it('runs whole steps and carries the remainder', () => {
    const loop = new FixedStepLoop(10, 5);
    let n = 0;
    const alpha = loop.advance(25, () => n++);
    expect(n).toBe(2);
    expect(alpha).toBeCloseTo(0.5);
    loop.advance(5, () => n++);
    expect(n).toBe(3);
  });

  it('caps steps per frame and drops the backlog', () => {
    const loop = new FixedStepLoop(10, 3);
    let n = 0;
    loop.advance(10_000, () => n++);
    expect(n).toBe(3);
    loop.advance(0, () => n++);
    expect(n).toBe(3);
  });
});

describe('SpatialGrid', () => {
  it('finds inserted points near the query and skips far ones', () => {
    const g = new SpatialGrid(1000, 1000, 50, 10);
    g.insert(0, 100, 100);
    g.insert(1, 120, 110);
    g.insert(2, 900, 900);
    const out = g.query(110, 105, 30, []);
    expect(out.sort()).toEqual([0, 1]);
    expect(g.query(900, 900, 10, [])).toEqual([2]);
    g.clear();
    expect(g.query(110, 105, 30, [])).toEqual([]);
  });

  it('clamps out-of-bounds positions into edge cells', () => {
    const g = new SpatialGrid(100, 100, 50, 2);
    g.insert(0, -20, 130);
    expect(g.query(0, 99, 5, [])).toEqual([0]);
  });
});

describe('Input recording', () => {
  it('stores only changes and plays them back tick-exact', () => {
    const rec = new InputRecorder(5);
    const cmds = [
      IDLE_COMMAND,
      { ...IDLE_COMMAND, moveX: 1 },
      { ...IDLE_COMMAND, moveX: 1 },
      { ...IDLE_COMMAND, moveX: 1, dodge: true },
      IDLE_COMMAND,
    ];
    cmds.forEach((c, t) => rec.record(t, c));
    expect(rec.log.entries.map((e) => e.tick)).toEqual([1, 3, 4]);
    const play = new InputPlayback(rec.log);
    cmds.forEach((c, t) => expect(play.commandFor(t)).toEqual(c));
  });
});
