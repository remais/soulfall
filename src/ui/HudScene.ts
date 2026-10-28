import Phaser from 'phaser';
import { ABILITIES } from '../data/abilities';
import { CLASSES } from '../data/classes';
import { t } from '../i18n/i18n';
import { ARENA_SCENE, ArenaScene, HudEvents } from '../render/ArenaScene';
import { CSS, FONT_TITLE, FONT_UI, PALETTE } from '../render/palette';
import { runSeconds } from '../sim/world';
import { DebugOverlay } from '../debug/DebugOverlay';

export const HUD_SCENE = 'hud';

interface AbilitySlot {
  key: string;
  label: string;
  icon: (g: Phaser.GameObjects.Graphics, s: number) => void;
  frame: Phaser.GameObjects.Graphics;
  iconG: Phaser.GameObjects.Graphics;
  shade: Phaser.GameObjects.Graphics;
  cdText: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

const SLOT = 64;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Screen-space UI on top of the arena: health, cooldowns, timer, pause and defeat screens. */
export class HudScene extends Phaser.Scene {
  private arena!: ArenaScene;
  private vignette!: Phaser.GameObjects.Image;
  private hurtVignette!: Phaser.GameObjects.Image;
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private slots: AbilitySlot[] = [];
  private pauseLayer!: Phaser.GameObjects.Container;
  private pauseLines: Phaser.GameObjects.Text[] = [];
  private defeatLayer!: Phaser.GameObjects.Container;
  private defeatSummary!: Phaser.GameObjects.Text;
  private debug: DebugOverlay | undefined;

  constructor() {
    super(HUD_SCENE);
  }

  create(): void {
    this.arena = this.scene.get(ARENA_SCENE) as ArenaScene;

    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0.5);
    this.hurtVignette = this.add.image(0, 0, 'vignette_red').setOrigin(0.5).setAlpha(0);

    this.add.text(24, 18, t('class.vanguard').toUpperCase(), {
      fontFamily: FONT_TITLE,
      fontSize: '18px',
      color: CSS.gold,
      stroke: '#000',
      strokeThickness: 3,
    });
    this.hpBar = this.add.graphics();
    this.hpText = this.add.text(0, 0, '', {
      fontFamily: FONT_UI,
      fontSize: '14px',
      color: CSS.text,
      fontStyle: 'bold',
    });
    this.hpText.setOrigin(0.5).setStroke('#000', 3);

    this.timerText = this.add
      .text(0, 16, '0:00', {
        fontFamily: FONT_TITLE,
        fontSize: '30px',
        color: CSS.text,
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);
    this.killsText = this.add
      .text(0, 54, '', {
        fontFamily: FONT_UI,
        fontSize: '14px',
        color: CSS.dim,
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);
    this.bannerText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_TITLE,
        fontSize: '34px',
        color: '#ff6ad5',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.controlsText = this.add
      .text(16, 0, t('hud.controls'), {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: CSS.dim,
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0, 1);

    this.createSlots();
    this.createPause();
    this.createDefeat();

    if (import.meta.env.DEV) this.debug = new DebugOverlay(this, this.arena);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => {
      if (this.arena.sim.world.state !== 'running') return;
      this.arena.setPaused(!this.arena.paused);
      this.refreshPause();
    });
    kb.on('keydown-R', () => {
      if (this.arena.sim.world.state === 'defeat') this.restartRun();
    });
    kb.on('keydown', (e: KeyboardEvent) => this.onSettingKey(e));

    this.game.events.on(HudEvents.playerHurt, this.onHurt, this);
    this.game.events.on(HudEvents.surge, this.onSurge, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(HudEvents.playerHurt, this.onHurt, this);
      this.game.events.off(HudEvents.surge, this.onSurge, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    this.time.delayedCall(25_000, () =>
      this.tweens.add({ targets: this.controlsText, alpha: 0.35, duration: 1500 }),
    );
  }

  private onSettingKey(e: KeyboardEvent): void {
    if (!this.arena.paused) return;
    const s = this.arena.settings;
    if (e.code === 'Digit1') this.arena.updateSettings({ screenShake: !s.screenShake });
    else if (e.code === 'Digit2') this.arena.updateSettings({ damageNumbers: !s.damageNumbers });
    else if (e.code === 'Digit3') this.arena.updateSettings({ lookAhead: !s.lookAhead });
    else if (e.code === 'KeyM') this.arena.updateSettings({ sound: !s.sound });
    else return;
    this.refreshPause();
  }

  private restartRun(): void {
    this.defeatLayer.setVisible(false);
    this.arena.restart();
  }

  private onHurt(): void {
    this.hurtVignette.setAlpha(0.9);
    this.tweens.add({ targets: this.hurtVignette, alpha: 0, duration: 380, ease: 'Quad.easeOut' });
  }

  private onSurge(): void {
    this.bannerText.setText(t('hud.surge')).setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: this.bannerText, alpha: 1, scale: 1, duration: 300, yoyo: true, hold: 1400 });
  }

  private createSlots(): void {
    const vg = CLASSES.vanguard;
    const defs: Pick<AbilitySlot, 'key' | 'label' | 'icon'>[] = [
      {
        key: 'Q',
        label: t(`ability.${vg.abilities[0]}`),
        icon: (g, s) => {
          g.fillStyle(PALETTE.slam).fillTriangle(s * 0.5, s * 0.18, s * 0.22, s * 0.62, s * 0.78, s * 0.62);
          g.lineStyle(3, 0x2a1408)
            .lineBetween(s * 0.5, s * 0.62, s * 0.42, s * 0.82)
            .lineBetween(s * 0.5, s * 0.62, s * 0.64, s * 0.8);
          g.lineStyle(2, 0xffe2b0).lineBetween(s * 0.2, s * 0.86, s * 0.8, s * 0.86);
        },
      },
      {
        key: 'E',
        label: t(`ability.${vg.abilities[1]}`),
        icon: (g, s) => {
          g.fillStyle(PALETTE.wrath).fillRoundedRect(s * 0.28, s * 0.2, s * 0.44, s * 0.36, 4);
          g.fillTriangle(s * 0.28, s * 0.54, s * 0.72, s * 0.54, s * 0.5, s * 0.84);
          g.lineStyle(3, 0xffffff)
            .lineBetween(s * 0.5, s * 0.28, s * 0.5, s * 0.7)
            .lineBetween(s * 0.38, s * 0.42, s * 0.62, s * 0.42);
        },
      },
      {
        key: 'SPACE',
        label: t('ability.dodge'),
        icon: (g, s) => {
          g.fillStyle(PALETTE.dodge);
          for (const o of [0, 0.18])
            g.fillTriangle(s * (0.3 + o), s * 0.3, s * (0.3 + o), s * 0.7, s * (0.55 + o), s * 0.5);
        },
      },
    ];
    this.slots = defs.map((d) => {
      const frame = this.add.graphics();
      const iconG = this.add.graphics();
      const shade = this.add.graphics();
      const cdText = this.add
        .text(0, 0, '', {
          fontFamily: FONT_UI,
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#fff',
          stroke: '#000',
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      const keyText = this.add
        .text(0, 0, d.key, {
          fontFamily: FONT_UI,
          fontSize: '11px',
          fontStyle: 'bold',
          color: CSS.text,
          backgroundColor: '#000000aa',
          padding: { x: 4, y: 1 },
        })
        .setOrigin(0.5);
      const nameText = this.add
        .text(0, 0, d.label, {
          fontFamily: FONT_UI,
          fontSize: '11px',
          color: CSS.dim,
          stroke: '#000',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0);
      d.icon(iconG, SLOT);
      return { ...d, frame, iconG, shade, cdText, keyText, nameText, x: 0, y: 0 };
    });
  }

  private createPause(): void {
    const bg = this.add.rectangle(0, 0, 10, 10, 0x05040a, 0.72).setOrigin(0);
    const title = this.add
      .text(0, -90, t('pause.title'), {
        fontFamily: FONT_TITLE,
        fontSize: '44px',
        color: CSS.gold,
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    const resume = this.add
      .text(0, -40, t('pause.resume'), { fontFamily: FONT_UI, fontSize: '16px', color: CSS.text })
      .setOrigin(0.5);
    this.pauseLines = [0, 1, 2, 3].map((i) =>
      this.add
        .text(0, 10 + i * 28, '', { fontFamily: FONT_UI, fontSize: '16px', color: CSS.dim })
        .setOrigin(0.5),
    );
    this.pauseLayer = this.add
      .container(0, 0, [bg, title, resume, ...this.pauseLines])
      .setVisible(false)
      .setDepth(100);
  }

  private refreshPause(): void {
    const s = this.arena.settings;
    const onOff = (v: boolean): string => t(v ? 'common.on' : 'common.off');
    this.pauseLines[0]!.setText(t('pause.shake', { v: onOff(s.screenShake) }));
    this.pauseLines[1]!.setText(t('pause.damageNumbers', { v: onOff(s.damageNumbers) }));
    this.pauseLines[2]!.setText(t('pause.lookAhead', { v: onOff(s.lookAhead) }));
    this.pauseLines[3]!.setText(t('pause.sound', { v: onOff(s.sound) }));
    this.pauseLayer.setVisible(this.arena.paused);
  }

  private createDefeat(): void {
    const bg = this.add.rectangle(0, 0, 10, 10, 0x12030a, 0.78).setOrigin(0);
    const title = this.add
      .text(0, -60, t('defeat.title'), {
        fontFamily: FONT_TITLE,
        fontSize: '52px',
        color: CSS.red,
        stroke: '#000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.defeatSummary = this.add
      .text(0, 6, '', { fontFamily: FONT_UI, fontSize: '18px', color: CSS.text })
      .setOrigin(0.5);
    const restart = this.add
      .text(0, 56, t('defeat.restart'), { fontFamily: FONT_UI, fontSize: '18px', color: CSS.gold })
      .setOrigin(0.5);
    this.tweens.add({ targets: restart, alpha: 0.45, duration: 800, yoyo: true, repeat: -1 });
    this.defeatLayer = this.add
      .container(0, 0, [bg, title, this.defeatSummary, restart])
      .setVisible(false)
      .setDepth(100);
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const diag = Math.hypot(w, h);
    this.vignette.setPosition(w / 2, h / 2).setDisplaySize(diag * 1.05, diag * 1.05);
    this.hurtVignette.setPosition(w / 2, h / 2).setDisplaySize(diag * 1.05, diag * 1.05);
    this.timerText.setX(w / 2);
    this.killsText.setX(w / 2);
    this.bannerText.setPosition(w / 2, h * 0.26);
    this.controlsText.setY(h - 14);

    const gap = 18;
    const total = this.slots.length * SLOT + (this.slots.length - 1) * gap;
    this.slots.forEach((s, i) => {
      s.x = w / 2 - total / 2 + i * (SLOT + gap);
      s.y = h - SLOT - 40;
      s.frame.setPosition(s.x, s.y);
      s.iconG.setPosition(s.x, s.y);
      s.shade.setPosition(s.x, s.y);
      s.cdText.setPosition(s.x + SLOT / 2, s.y + SLOT / 2);
      s.keyText.setPosition(s.x + SLOT / 2, s.y - 2);
      s.nameText.setPosition(s.x + SLOT / 2, s.y + SLOT + 4);
    });

    for (const layer of [this.pauseLayer, this.defeatLayer]) {
      layer.setPosition(w / 2, h / 2);
      const bg = layer.list[0] as Phaser.GameObjects.Rectangle;
      bg.setPosition(-w / 2, -h / 2).setSize(w, h);
    }
    this.debug?.layout(w);
  }

  override update(time: number): void {
    const sim = this.arena.sim;
    if (!sim) return;
    const p = sim.player;
    const w = sim.world;

    // Health bar.
    const bx = 24;
    const by = 46;
    const bw = 260;
    const bh = 18;
    const frac = Phaser.Math.Clamp(p.hp / p.stats.maxHealth, 0, 1);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.6).fillRoundedRect(bx - 3, by - 3, bw + 6, bh + 6, 5);
    this.hpBar.fillStyle(0x3a0d14).fillRoundedRect(bx, by, bw, bh, 3);
    if (frac > 0)
      this.hpBar.fillStyle(frac < 0.3 ? 0xff2a3d : 0xd8263a).fillRoundedRect(bx, by, bw * frac, bh, 3);
    this.hpBar.fillStyle(0xffffff, 0.12).fillRect(bx + 2, by + 2, Math.max(0, bw * frac - 4), 4);
    if (p.wrathTimer > 0)
      this.hpBar.lineStyle(2, PALETTE.wrath, 0.9).strokeRoundedRect(bx - 3, by - 3, bw + 6, bh + 6, 5);
    this.hpText
      .setPosition(bx + bw / 2, by + bh / 2)
      .setText(`${Math.ceil(p.hp)} / ${Math.round(p.stats.maxHealth)}`);

    this.timerText.setText(formatTime(runSeconds(w)));
    this.killsText.setText(t('hud.kills', { n: w.stats.kills }));

    // Ability slots: [Q, E, Dodge].
    const vg = CLASSES.vanguard;
    const cds: [number, number, boolean][] = [
      [p.ability1Cooldown, ABILITIES[vg.abilities[0]].cooldown, false],
      [p.ability2Cooldown, ABILITIES[vg.abilities[1]].cooldown, p.wrathTimer > 0],
      [p.dodgeCooldown, vg.dodge.cooldown, false],
    ];
    this.slots.forEach((s, i) => {
      const [remaining, total, active] = cds[i]!;
      const ready = remaining <= 0;
      s.frame.clear();
      s.frame.fillStyle(0x0c0a12, 0.85).fillRoundedRect(0, 0, SLOT, SLOT, 8);
      const border = active ? PALETTE.wrath : ready ? 0x9fd8ff : 0x3a3550;
      const glow = ready && !active ? 0.5 + Math.sin(time * 0.006) * 0.2 : 1;
      s.frame.lineStyle(active ? 3 : 2, border, glow).strokeRoundedRect(0, 0, SLOT, SLOT, 8);
      s.shade.clear();
      if (!ready) {
        const f = Phaser.Math.Clamp(remaining / total, 0, 1);
        s.shade.fillStyle(0x000000, 0.68).fillRect(2, 2 + (SLOT - 4) * (1 - f), SLOT - 4, (SLOT - 4) * f);
        s.cdText.setText(remaining >= 1 ? String(Math.ceil(remaining)) : remaining.toFixed(1));
      } else {
        s.cdText.setText('');
      }
      s.iconG.setAlpha(ready || active ? 1 : 0.55);
    });

    if (this.arena.consumeDefeat()) {
      this.defeatSummary.setText(
        t('defeat.summary', { time: formatTime(runSeconds(w)), kills: w.stats.kills }),
      );
      this.defeatLayer.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.defeatLayer, alpha: 1, duration: 900, delay: 500 });
    }

    this.debug?.update();
  }
}
