# Game design

Source of truth for intent: MASTER_PROMPT_V5 (kept by the creative director). This file documents what is **built** and how it works.

## Pillars
- Survivor-style auto-attacks + two manual class abilities + dodge.
- Risk/reward through the Corruption Meter and the Daily Rift (not built yet — Phase 1C / 2).
- Readability during 300+ enemy hordes beats detail.

## Current state: Phase 1A combat prototype

- **Arena — Shattered Sanctum:** 3200×3200, central rune circle, inner ring of 6 pillars, outer ring of 8, four corner pillars, walls with a glowing rift edge. Pillars block player and enemies.
- **Vanguard:** durable melee. Heavy Sword auto-cleaves toward the nearest enemy (only when something is in reach). Q Seismic Slam: AoE damage + stun + knockback (interrupts enemy wind-ups). E Guardian's Wrath: damage reduction + holy pulses. Space dodge: dash with i-frames.
- **Rift Husk:** chases, separates from other husks, telegraphs (red flash + swell) before each melee hit. Dodging out of reach during the wind-up avoids the hit.
- **Waves:** endless; spawn rate and enemy HP ramp per minute; surge rings every 40 s.
- **Defeat:** "You have fallen" with time + kills; R restarts with a new seed.
- **Feel:** hit flash, knockback, damage numbers (merged/limited), slash arcs, slam shockwave + debris + cracks, wrath aura, dodge afterimages, screen shake (toggle), WebAudio SFX (toggle), camera look-ahead (toggle), zoom adapts to window height.

## Not built yet
XP/level-ups, more weapons, corruption, Rift Gates, bosses, loot, saves, hub. See PROGRESS.md roadmap.
