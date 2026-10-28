# Soulfall (working title: Riftbound: Soulfall)

2D top-down action roguelite RPG for the browser. TypeScript + Phaser 3 + Vite.

## Requirements

- Node.js 20.19+ (developed on Node 24)

## Install & run

```bash
npm install
npm run dev          # http://localhost:5173
```

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Move |
| Q | Seismic Slam |
| E | Guardian's Wrath |
| Space | Dodge |
| Esc | Pause (settings: 1 shake, 2 damage numbers, 3 look-ahead, M sound) |
| R | Restart after defeat |
| ` (backquote) | Debug overlay — dev builds only (1 spawn 50, 2 spawn 300, 3 god, 4 kill all, 5 heal, 6 reset cooldowns) |

## Test

```bash
npm test             # unit tests (Vitest)
npm run test:smoke   # browser smoke tests (Playwright; starts dev + prod servers itself)
npm run check        # typecheck + lint + unit tests
```

First time Playwright: `npx playwright install chromium`.

## Build & deploy

```bash
npm run build        # typecheck + production build into dist/
npm run preview      # serve dist/ locally
```

Pushing to `main` on GitHub runs `.github/workflows/deploy.yml`: typecheck, lint, unit tests, build, deploy to GitHub Pages (enable Pages → Source: GitHub Actions in the repo settings once).

## Docs

- [CLAUDE.md](CLAUDE.md) — rules for the AI developer
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/BALANCE.md](docs/BALANCE.md)
- [docs/PROGRESS.md](docs/PROGRESS.md) · [docs/DECISIONS.md](docs/DECISIONS.md) · [docs/TEST_PLAN.md](docs/TEST_PLAN.md)
- [docs/ASSET_MANIFEST.md](docs/ASSET_MANIFEST.md)
