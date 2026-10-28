# Decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-10-28 | Phaser **3.90.0** (not 4.x) for now | Spec names Phaser 3. Phaser 4 is stable (4.2.1) and 3.90 gets no new releases since May 2025 — upgrade proposed to the user. Render layer is thin, so migration cost is low. |
| 2026-10-28 | TypeScript **6.0.3** (not 7.0) | typescript-eslint 8.72 supports TS < 6.1 only. |
| 2026-10-28 | Vite 8.3.5, Vitest 5.0.5, Playwright 1.64.1, ESLint 10, Prettier 3.9 | Latest stable at setup. |
| 2026-10-28 | Content/config as typed `.ts` data files (`satisfies`) instead of JSON | Compile-time schema checking for free; can export to JSON later if needed. |
| 2026-10-28 | Placeholder art generated in code; no external assets yet | €0, no license risk, consistent style; paper-doll layer convention fixed early (128×128, facing +x). |
| 2026-10-28 | SFX synthesized with WebAudio | No audio files/licenses needed for the prototype. |
| 2026-10-28 | Auto-sword only swings when an enemy is within aim range (230 px) | Constant swinging at nothing felt noisy. |
| 2026-10-28 | Abilities are hold-to-cast (fire as soon as ready while key held) | Taps are latched too, so no input is lost. |
| 2026-10-28 | 0.25 s hurt i-frames after any hit | Prevents instant melts when surrounded; tunable per class. |
| 2026-10-28 | Camera zoom adapts to window height (target 820 world px visible, clamp 0.6–1.6) | Any window size/aspect without huge advantage on 4K screens. |
| 2026-10-28 | Relative Vite `base: './'` | Same build works on GitHub Pages sub-path and Cloudflare Pages. |
| 2026-10-28 | Risk logged: JS trig functions not bit-identical across engines | Cross-browser replay verification (Phase 5) may need deterministic math. Same-engine determinism is tested. |
