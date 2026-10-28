# Test plan

## Automated

| Suite | Command | Covers |
|---|---|---|
| Unit (Vitest) | `npm test` | `tests/unit/` |
| Smoke (Playwright) | `npm run test:smoke` | `tests/smoke/` against dev server and production build |

### Unit — `tests/unit/`
- **combatMath:** stacking order (flat → add% → mult), every stat clamps to max and min under absurd stacking, base stats within caps, CDR cap + min cooldown, attack-speed cap, armor formula, multiplicative mitigation layers, total mitigation cap, min damage, crit 0%/100%, crit rate convergence, damage multiplier.
- **core:** RNG reproducibility/range/state save, string hash, fixed-step loop (remainder + backlog drop), spatial grid queries, input recording (changes only) + tick-exact playback.
- **simulation:** determinism (same seed + inputs ⇒ same hash; recorded log replays identically; different seeds diverge), movement speed + diagonal normalisation, obstacle/bounds collision, dodge (dash distance, i-frames, cooldown, no re-trigger while held), no damage during i-frames, sword (damage, no swing out of range, arc only, interval), Seismic Slam (radius, damage, stun, cooldown), Guardian's Wrath (pulse count, damage, mitigation exactly −45%), enemy chase speed, telegraph-then-hit, dodge out of a wind-up, death ⇒ defeat + frozen end tick, separation, director spawns + surge, 350-enemy tick cost bound.

### Smoke — `tests/smoke/game.spec.ts`
- Dev + prod: page loads, canvas visible, title, no console errors for 2.5 s.
- Dev: sim ticks; real key presses move the player and trigger Q / E / Space cooldowns; Esc pauses and resumes.
- Dev: horde benchmark with 350 enemies (logs FPS; headless software GPU caps at ~30 FPS, so the number is informational).

## Manual (each phase)
Play in the browser: movement, camera, abilities, dodge, horde of 300+ (debug overlay: backquote, then 2), defeat + restart, pause settings, window resize. Report screenshots and real FPS.
