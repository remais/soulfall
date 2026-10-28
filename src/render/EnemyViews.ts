import Phaser from 'phaser';
import type { Enemy, Player } from '../sim/world';
import { PALETTE } from './palette';

const TEXTURE_FOR: Record<string, string> = { riftHusk: 'enemy_husk' };

/** One pooled sprite per sim enemy slot. */
export class EnemyViews {
  private readonly sprites: (Phaser.GameObjects.Image | undefined)[] = [];
  private readonly ids: number[] = [];
  private readonly flashUntil: number[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  flash(slot: number, timeMs: number): void {
    this.flashUntil[slot] = timeMs + 70;
  }

  update(enemies: readonly Enemy[], target: Player, alpha: number, timeMs: number): void {
    for (const e of enemies) {
      let sp = this.sprites[e.slot];
      if (!e.active) {
        if (sp?.visible) sp.setVisible(false);
        continue;
      }
      if (!sp) {
        sp = this.scene.add.image(0, 0, TEXTURE_FOR[e.defId] ?? 'enemy_husk').setDepth(10);
        this.sprites[e.slot] = sp;
      }
      if (this.ids[e.slot] !== e.id) {
        // Slot was reused by a new enemy.
        this.ids[e.slot] = e.id;
        this.flashUntil[e.slot] = 0;
        sp.setVisible(true).setAlpha(1);
      }
      const x = e.prevX + (e.x - e.prevX) * alpha;
      const y = e.prevY + (e.y - e.prevY) * alpha;
      sp.setPosition(x, y);
      sp.setRotation(Math.atan2(target.y - y, target.x - x));

      if (timeMs < (this.flashUntil[e.slot] ?? 0)) {
        sp.setTintFill(0xffffff).setScale(1.08);
      } else if (e.state === 'windup') {
        const pulse = 1 + Math.sin(timeMs * 0.04) * 0.08;
        sp.setTint(PALETTE.telegraph).setScale(1.12 * pulse);
      } else if (e.stun > 0) {
        sp.setTint(0x8fa0ff).setScale(0.95);
      } else {
        sp.clearTint().setScale(1);
      }
    }
  }

  get visibleCount(): number {
    return this.sprites.filter((s) => s?.visible).length;
  }
}
