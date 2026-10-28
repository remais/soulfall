# CLAUDE.md — Soulfall

Sole developer: Claude Code. Creative director/playtester: the user.

## Start of every session
Read this file and [docs/PROGRESS.md](docs/PROGRESS.md) first. Full spec: MASTER_PROMPT_V5 (user keeps it; key rules summarized here).

## Rules
- Talk to the user in **Dutch**, short. Code, comments, commits, docs in **English**.
- One decision per question, with a recommended default. Small choices: decide, log in [docs/DECISIONS.md](docs/DECISIONS.md).
- Never silently change a confirmed decision (genre, classes, corruption, Daily Rift, monetization undecided, etc.).
- Never claim something works without running it: `npm run check`, `npm run test:smoke`, and play it in the browser.
- Budget €0: only free tools/tiers and CC0/clearly-licensed assets (log in [docs/ASSET_MANIFEST.md](docs/ASSET_MANIFEST.md)).
- No shops, premium currency, payments, accounts, or multiplayer until the user decides.
- Update [docs/PROGRESS.md](docs/PROGRESS.md) after every meaningful step.

## Code rules
- `src/sim/**` is pure TS: no Phaser, no DOM, no `Math.random`, no `Date.now` (ESLint enforces). Seeded `Rng` only.
- All balance numbers live in `src/data/**`. All stat math lives in `src/sim/combat/combatMath.ts` (documented in docs/BALANCE.md).
- Renderer reads sim state + drained `SimEvent`s; it never mutates gameplay state (debug overlay excepted, dev only).
- UI strings go through `t()` with keys in `src/i18n/en.json`.
- Game title lives only in `src/data/game.ts` (`GAME_TITLE`).
