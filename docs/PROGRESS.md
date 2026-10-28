# Progress

## Status (2026-10-28)

**Phase 0 — Setup:** done except deploy (waiting on user OK to create GitHub repo).
**Phase 1A — Combat prototype:** done, tested.

### Done
- Vite 8 + TS 6 (strict) + Phaser 3.90, ESLint (sim purity rules), Prettier, Vitest, Playwright.
- Seeded RNG, fixed 60 Hz loop with interpolation, input commands + recording/playback, spatial grid.
- Vanguard: movement, dodge, auto Heavy Sword cleave, Seismic Slam (Q), Guardian's Wrath (E).
- Rift Husk enemy with chase, separation, telegraphed melee. Endless director with ramp + surges.
- HUD: HP, cooldown slots, timer, kills, pause/settings, defeat + restart. Dev debug overlay.
- Docs set, GitHub Actions workflow (CI + Pages deploy).

### Test results (2026-10-28)
- Unit: 45/45 pass. Typecheck + lint clean.
- Smoke: 4/4 pass (2 dev-only tests skipped on prod build by design).
- Production bundle: 1.24 MB (334 KB gzip), debug code stripped.

### Performance (2026-10-28)
| Setup | Idle | 355 enemies | Sim cost |
|---|---|---|---|
| Headless Chromium + D3D11, AMD RX 7800 XT, 1600×900, uncapped | 528 FPS | 505 FPS (worst frame 10 ms) | 0.19 ms/tick |
| Headless software GPU (Playwright default) | 31 FPS | 27 FPS | 0.17 ms/tick |

Desktop GPU is far above "average laptop" — a real laptop check is still open.

## Next
1. Deploy (needs GitHub repo — user decision).
2. Playtest feedback on Phase 1A feel.
3. Phase 1B — XP gems, level-up cards, Frost Staff / Lightning Orb / Fireburst, passives, reroll/banish, 1 evolution, codex entry.

## Known issues
- Prod bundle > 500 KB warning suppressed (Phaser is ~1 MB); fine for now, can code-split later.
- Pause/defeat text uses system fonts; real fonts later (licensed).
