# Architecture

## Layers

```
input/ (KeyboardInput) ──PlayerCommand per tick──▶ sim/ (Simulation.step) ──state + SimEvents──▶ render/ + ui/ (Phaser)
                                                       ▲
                                     data/ (balance + content definitions)
```

- **`src/sim/`** — deterministic game logic, no Phaser. `Simulation.step(commands[])` advances one fixed tick (60 Hz).
  - `core/` rng (mulberry32), fixed-step loop, commands + input recording/playback, spatial grid, collision, events
  - `combat/` stats, `combatMath` (stacking, caps, damage, mitigation), `damage` (apply hits)
  - `player/`, `weapons/`, `abilities/`, `enemies/`, `director/` — one system per file
  - `world.ts` — all mutable run state (`World`, `Player`, `Enemy`)
- **`src/data/`** — every tunable number and content definition (classes, weapons, abilities, enemies, arena, director, combat rules, settings). Typed with `satisfies`.
- **`src/render/`** — Phaser scenes. `ArenaScene` owns the Simulation + `FixedStepLoop`, interpolates positions between ticks, turns `SimEvent`s into VFX/SFX. `PlayerView` (paper-doll layers), `EnemyViews` (sprite per pool slot), `Effects`, `Sfx` (WebAudio synth), `textures` (placeholder art generated in code).
- **`src/ui/`** — `HudScene` runs on top of the arena (HP, cooldowns, timer, pause/settings, defeat screen).
- **`src/input/`** — `InputSource` interface; `KeyboardInput` latches taps between ticks. Touch joystick plugs in later behind the same interface.
- **`src/debug/`** — dev-only overlay; only constructed under `import.meta.env.DEV`, so it is tree-shaken from production builds (verified: no debug strings in `dist/`).
- **`src/i18n/`** — `en.json` + `t(key, params)`.

## Determinism

- Fixed timestep, seeded RNG, integer-quantized input → same seed + same input log = identical state hash (unit-tested).
- `InputRecorder` stores only command changes; `InputPlayback` replays them tick-exact (basis for Daily Rift + replay verification).
- ESLint forbids `Math.random`, `Date.now`, `performance` and Phaser imports inside `src/sim/`.
- **Known risk:** `Math.sin/cos/atan2/hypot` are not guaranteed bit-identical across JS engines. Same-browser replays are safe; cross-engine server verification (Phase 5) may need deterministic math replacements. Logged in DECISIONS.md.

## Co-op readiness

- `World.players[]` and `step(commands[])` are per-player; enemies target the nearest alive player.
- Sim never pauses itself; pausing is a renderer concern (solo only).

## Performance

- Enemies live in a fixed pool (`SIM_CONFIG.maxEnemies`); renderer keeps one sprite per slot (no per-frame allocation).
- `SpatialGrid` (64 px cells, typed-array linked lists) rebuilt each tick for separation and hit queries.
- Damage numbers pooled, merged per enemy within 140 ms, and limited to crits when the screen is crowded.
- Measured numbers: see PROGRESS.md.

## Paper-doll

All character layers are drawn on the same 128×128 canvas, facing +x, body centre at the canvas centre (`DOLL_SIZE` in `render/textures.ts`). Layers stack with origin (0.5, 0.5): base → chest → weapon → helmet. Missing textures fall back to a placeholder; stats never depend on visuals.
