import Phaser from 'phaser';
import { PALETTE } from './palette';

/**
 * Placeholder art generated in code (no external assets yet, see ASSET_MANIFEST.md).
 *
 * Paper-doll convention: every character layer (base, helmet, chest, weapon) is drawn
 * on the same DOLL_SIZE canvas, facing +x, with the body centre at the canvas centre.
 * Layers therefore line up when stacked with origin (0.5, 0.5) and rotated together.
 */
export const DOLL_SIZE = 128;
const C = DOLL_SIZE / 2;

type G = Phaser.GameObjects.Graphics;

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function radialTexture(scene: Phaser.Scene, key: string, size: number, stops: [number, string][]): void {
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

/** Tiny deterministic LCG for decorative noise (render-only). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generateTextures(scene: Phaser.Scene): void {
  // --- Vanguard base body (cloak, pauldrons, gauntlets) ---
  bake(scene, 'vanguard_base', DOLL_SIZE, DOLL_SIZE, (g) => {
    g.fillStyle(0x000000, 0.35).fillEllipse(C + 2, C + 4, 44, 40); // drop shadow
    g.fillStyle(PALETTE.cloak).fillCircle(C - 3, C, 17); // cloak
    g.fillStyle(PALETTE.cloakDark).fillCircle(C - 8, C, 12);
    // pauldrons
    for (const side of [-1, 1]) {
      g.fillStyle(PALETTE.steelDark).fillEllipse(C + 1, C + side * 15, 22, 15);
      g.fillStyle(PALETTE.steel).fillEllipse(C + 2, C + side * 15, 18, 11);
      g.lineStyle(2, PALETTE.gold).strokeEllipse(C + 2, C + side * 15, 18, 11);
    }
    // gauntlets (hands forward)
    g.fillStyle(PALETTE.steelDark).fillCircle(C + 14, C + 15, 5);
    g.fillStyle(PALETTE.steelDark).fillCircle(C + 12, C - 13, 4.5);
    // outline for readability against the floor
    g.lineStyle(2, PALETTE.playerRim, 0.9).strokeCircle(C - 3, C, 18);
  });

  // --- Helmet layer (visible gear slot) ---
  bake(scene, 'gear_helmet_iron', DOLL_SIZE, DOLL_SIZE, (g) => {
    g.fillStyle(PALETTE.steelDark).fillCircle(C + 1, C, 10.5);
    g.fillStyle(PALETTE.steelLight).fillCircle(C + 1, C, 8.5);
    g.fillStyle(PALETTE.visor).fillRect(C + 4, C - 5, 4, 10); // visor slit faces +x
    g.lineStyle(3, PALETTE.gold).lineBetween(C - 9, C, C + 2, C); // crest
  });

  // --- Weapon layer: heavy sword held in the right hand, pointing +x ---
  bake(scene, 'gear_weapon_heavysword', DOLL_SIZE, DOLL_SIZE, (g) => {
    const hx = C + 14;
    const hy = C + 15;
    g.fillStyle(PALETTE.blade).fillTriangle(hx + 8, hy - 4, hx + 8, hy + 4, hx + 52, hy);
    g.fillStyle(PALETTE.bladeEdge).fillTriangle(hx + 8, hy - 1, hx + 8, hy + 1, hx + 52, hy);
    g.fillStyle(PALETTE.gold).fillRect(hx + 4, hy - 8, 4, 16); // crossguard
    g.fillStyle(PALETTE.leather).fillRect(hx - 6, hy - 2, 10, 4); // grip
    g.fillStyle(PALETTE.gold).fillCircle(hx - 7, hy, 3); // pommel
  });

  // --- Rift Husk enemy (faces +x) ---
  bake(scene, 'enemy_husk', 48, 48, (g) => {
    g.fillStyle(0x000000, 0.35).fillEllipse(26, 28, 34, 30);
    g.fillStyle(PALETTE.huskBody).fillCircle(24, 24, 15);
    g.fillStyle(PALETTE.huskCrack).fillTriangle(14, 18, 22, 24, 13, 28);
    g.fillStyle(PALETTE.huskCrack).fillTriangle(20, 11, 25, 22, 28, 12);
    g.lineStyle(2, PALETTE.huskRim).strokeCircle(24, 24, 15);
    g.fillStyle(PALETTE.huskEye).fillCircle(33, 19, 3).fillCircle(33, 29, 3);
    g.fillStyle(0xffffff).fillCircle(34, 19, 1).fillCircle(34, 29, 1);
  });

  // --- Floor tile ---
  bake(scene, 'floor_tile', 128, 128, (g) => {
    const rnd = lcg(7);
    g.fillStyle(PALETTE.floor).fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * 64;
      const y = Math.floor(i / 2) * 64;
      g.fillStyle(PALETTE.floorSlab, 0.5 + rnd() * 0.5).fillRect(x + 2, y + 2, 60, 60);
    }
    g.lineStyle(2, PALETTE.floorGrout)
      .strokeRect(0, 0, 128, 128)
      .lineBetween(64, 0, 64, 128)
      .lineBetween(0, 64, 128, 64);
    g.lineStyle(1, PALETTE.floorCrack, 0.8);
    for (let i = 0; i < 3; i++) {
      const x = rnd() * 128;
      const y = rnd() * 128;
      g.lineBetween(x, y, x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 30);
    }
    for (let i = 0; i < 18; i++)
      g.fillStyle(PALETTE.floorSpeck, 0.4).fillRect(rnd() * 128, rnd() * 128, 2, 2);
  });

  // --- FX ---
  radialTexture(scene, 'glow', 128, [
    [0, 'rgba(255,255,255,1)'],
    [0.35, 'rgba(255,255,255,0.45)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  radialTexture(scene, 'vignette', 512, [
    [0, 'rgba(0,0,0,0)'],
    [0.55, 'rgba(0,0,0,0.05)'],
    [1, 'rgba(0,0,0,0.85)'],
  ]);
  radialTexture(scene, 'vignette_red', 512, [
    [0, 'rgba(160,0,20,0)'],
    [0.6, 'rgba(160,0,20,0.1)'],
    [1, 'rgba(200,0,30,0.7)'],
  ]);
  bake(scene, 'spark', 8, 8, (g) => g.fillStyle(0xffffff).fillCircle(4, 4, 4));
  bake(scene, 'shard', 8, 8, (g) => g.fillStyle(0xffffff).fillTriangle(0, 8, 4, 0, 8, 8));
}
