import Phaser from 'phaser';
import type { ArenaScene } from '../render/ArenaScene';

const HELP = [
  '` toggle debug',
  '1 spawn 50 · 2 spawn 300',
  '3 god mode · 4 kill all',
  '5 heal · 6 reset cooldowns',
];

/**
 * Dev-only overlay (only constructed when import.meta.env.DEV, so it is
 * tree-shaken out of production builds). Shows FPS / entity counts and
 * exposes cheat keys. Also publishes window.__soulfall for smoke tests.
 */
export class DebugOverlay {
  private readonly text: Phaser.GameObjects.Text;
  private visible = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly arena: ArenaScene,
  ) {
    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        color: '#9dffb0',
        backgroundColor: '#000000b0',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(200)
      .setVisible(false);

    const kb = scene.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    (window as unknown as { __soulfall: unknown }).__soulfall = {
      game: scene.game,
      get sim() {
        return arena.sim;
      },
      get fps() {
        return scene.game.loop.actualFps;
      },
    };
  }

  private onKey(e: KeyboardEvent): void {
    if (e.code === 'Backquote') {
      this.visible = !this.visible;
      this.text.setVisible(this.visible);
      return;
    }
    if (!this.visible) return;
    const sim = this.arena.sim;
    switch (e.code) {
      case 'Digit1':
        sim.debugSpawn(50);
        break;
      case 'Digit2':
        sim.debugSpawn(300, 250, 900);
        break;
      case 'Digit3':
        sim.player.invulnerable = !sim.player.invulnerable;
        break;
      case 'Digit4':
        sim.debugKillAll();
        break;
      case 'Digit5':
        sim.debugHeal();
        break;
      case 'Digit6':
        sim.debugResetCooldowns();
        break;
    }
  }

  layout(w: number): void {
    this.text.setPosition(w - 12, 12);
  }

  update(): void {
    if (!this.visible) return;
    const sim = this.arena.sim;
    const w = sim.world;
    const p = sim.player;
    this.text.setText([
      `FPS ${this.scene.game.loop.actualFps.toFixed(0)}  sim ${this.arena.simStepMs.toFixed(2)} ms/tick`,
      `enemies ${w.activeEnemies}  tick ${w.tick}  seed ${w.seed}`,
      `hp ${p.hp.toFixed(0)}  god ${p.invulnerable ? 'ON' : 'off'}  dmg dealt ${w.stats.damageDealt.toFixed(0)}`,
      `renderer ${this.scene.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'}`,
      '',
      ...HELP,
    ]);
  }
}
