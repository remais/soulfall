import Phaser from 'phaser';
import type { Player } from '../sim/world';
import { PALETTE } from './palette';

/** Visible paper-doll slots, bottom to top. Stats never depend on these. */
export interface DollLayers {
  base: string;
  chest?: string;
  helmet?: string;
  weapon?: string;
}

const FALLBACK_TEXTURE = '__WHITE';

/**
 * Renders a player as stacked layers sharing one anchor. The whole doll rotates to
 * face the aim direction; the weapon layer gets an extra swing rotation.
 */
export class PlayerView {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly weapon: Phaser.GameObjects.Image | undefined;
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly glow: Phaser.GameObjects.Image;
  private readonly wrathAura: Phaser.GameObjects.Image;
  private facing = 0;
  private swingOffset = 0;
  private swingFrom = 0;
  private swingTo = 0;
  private swingT = 1;
  private swingDuration = 120;
  private bob = 0;
  private flashUntil = 0;

  constructor(scene: Phaser.Scene, layers: DollLayers) {
    this.glow = scene.add
      .image(0, 0, 'glow')
      .setTint(0x6fb7ff)
      .setAlpha(0.28)
      .setScale(1.6)
      .setBlendMode('ADD');
    this.wrathAura = scene.add
      .image(0, 0, 'glow')
      .setTint(PALETTE.wrath)
      .setBlendMode('ADD')
      .setVisible(false);
    this.body = scene.add.container(0, 0);
    const add = (key: string | undefined): Phaser.GameObjects.Image | undefined => {
      if (!key) return undefined;
      const img = scene.add.image(0, 0, scene.textures.exists(key) ? key : FALLBACK_TEXTURE);
      this.sprites.push(img);
      return img;
    };
    const base = add(layers.base)!;
    const chest = add(layers.chest);
    const helmet = add(layers.helmet);
    this.weapon = add(layers.weapon);
    // Weapon under the helmet so the head reads on top.
    for (const l of [base, chest, this.weapon, helmet]) if (l) this.body.add(l);
    this.container = scene.add.container(0, 0, [this.glow, this.wrathAura, this.body]).setDepth(20);
    // Always-on-top marker so the player never gets lost in a horde.
    this.marker = scene.add.graphics().setDepth(45);
    this.marker.lineStyle(2, PALETTE.playerRim, 0.75).strokeCircle(0, 0, 27);
    this.marker.fillStyle(PALETTE.playerRim, 0.9).fillTriangle(-5, -33, 5, -33, 0, -27);
  }

  private readonly marker: Phaser.GameObjects.Graphics;

  swing(angle: number, arc: number, durationMs: number): void {
    this.facing = angle;
    this.swingFrom = -arc / 2;
    this.swingTo = arc / 2;
    this.swingT = 0;
    this.swingDuration = durationMs;
  }

  flash(timeMs: number): void {
    this.flashUntil = timeMs + 90;
  }

  update(p: Player, x: number, y: number, timeMs: number, deltaMs: number): void {
    this.container.setPosition(x, y);
    this.container.setVisible(p.alive);
    this.marker.setPosition(x, y).setVisible(p.alive);

    if (this.swingT < 1) {
      this.swingT = Math.min(1, this.swingT + deltaMs / this.swingDuration);
      const e = 1 - (1 - this.swingT) ** 3;
      this.swingOffset = this.swingFrom + (this.swingTo - this.swingFrom) * e;
    } else {
      // Ease back to rest and turn with movement.
      this.swingOffset *= 0.8;
      if (p.moving)
        this.facing = rotateTowards(this.facing, Math.atan2(p.facingY, p.facingX), deltaMs * 0.012);
    }
    this.body.setRotation(this.facing);
    this.weapon?.setRotation(this.swingOffset);

    this.bob += p.moving ? deltaMs * 0.018 : 0;
    const s = 1 + (p.moving ? Math.sin(this.bob) * 0.035 : 0);
    this.body.setScale(s, 1 / s);

    const dodging = p.dodgeTimer > 0;
    const iframeBlink = p.iframes > 0 && !dodging && Math.floor(timeMs / 60) % 2 === 0;
    this.body.setAlpha(dodging ? 0.55 : iframeBlink ? 0.6 : 1);

    const flashing = timeMs < this.flashUntil;
    for (const sp of this.sprites) {
      if (flashing) sp.setTintFill(PALETTE.hurt);
      else sp.clearTint();
    }

    const wrath = p.wrathTimer > 0;
    this.wrathAura.setVisible(wrath);
    if (wrath) {
      const pulse = 0.28 + Math.sin(timeMs * 0.012) * 0.08;
      this.wrathAura.setAlpha(pulse).setScale(2.6 + Math.sin(timeMs * 0.008) * 0.15);
    }
  }

  destroy(): void {
    this.container.destroy();
    this.marker.destroy();
  }
}

function rotateTowards(from: number, to: number, maxStep: number): number {
  const diff = Phaser.Math.Angle.Wrap(to - from);
  if (Math.abs(diff) <= maxStep) return to;
  return from + Math.sign(diff) * maxStep;
}
