import Phaser from 'phaser';
import { CSS, FONT_UI, PALETTE } from './palette';

interface DamageNumber {
  text: Phaser.GameObjects.Text;
  slot: number;
  amount: number;
  age: number;
  life: number;
  vy: number;
  crit: boolean;
}

const MAX_NUMBERS = 50;
const CROWDED_NUMBERS = 24;
/** Hits on the same enemy within this window are merged into one number. */
const MERGE_WINDOW_MS = 140;

/** Short-lived visual feedback: slashes, shockwaves, particles, damage numbers. */
export class Effects {
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly souls: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly holy: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly numbers: DamageNumber[] = [];
  private readonly freeTexts: Phaser.GameObjects.Text[] = [];
  damageNumbersEnabled = true;

  constructor(private readonly scene: Phaser.Scene) {
    this.sparks = scene.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 220 },
      lifespan: { min: 150, max: 320 },
      scale: { start: 0.6, end: 0 },
      tint: [0xffffff, 0xd8ecff],
      blendMode: 'ADD',
      emitting: false,
    });
    this.dust = scene.add.particles(0, 0, 'shard', {
      speed: { min: 120, max: 420 },
      lifespan: { min: 300, max: 650 },
      scale: { start: 1.3, end: 0.2 },
      rotate: { min: 0, max: 360 },
      tint: [0x6b5a48, 0x8c7458, PALETTE.slam],
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.souls = scene.add.particles(0, 0, 'spark', {
      speed: { min: 30, max: 140 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 0.9, end: 0 },
      tint: [PALETTE.death, PALETTE.huskCrack],
      blendMode: 'ADD',
      emitting: false,
    });
    this.holy = scene.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 160 },
      lifespan: { min: 250, max: 500 },
      scale: { start: 0.7, end: 0 },
      tint: [PALETTE.wrath, 0xffffff],
      blendMode: 'ADD',
      emitting: false,
    });
    for (const e of [this.sparks, this.dust, this.souls, this.holy]) e.setDepth(30);
  }

  slash(x: number, y: number, angle: number, arc: number, range: number): void {
    const g = this.scene.add.graphics({ x, y }).setDepth(25).setBlendMode('ADD');
    const start = angle - arc / 2;
    const end = angle + arc / 2;
    g.fillStyle(PALETTE.slash, 0.1);
    g.slice(0, 0, range, start, end, false).fillPath();
    g.lineStyle(4, PALETTE.slash, 0.7);
    g.beginPath()
      .arc(0, 0, range * 0.92, start, end, false)
      .strokePath();
    g.lineStyle(2, 0xffffff, 0.45);
    g.beginPath()
      .arc(0, 0, range * 0.75, start + arc * 0.15, end - arc * 0.1, false)
      .strokePath();
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  ring(x: number, y: number, radius: number, color: number, width: number, duration: number, fill = 0): void {
    const g = this.scene.add.graphics({ x, y }).setDepth(24).setBlendMode('ADD');
    if (fill > 0) g.fillStyle(color, fill).fillCircle(0, 0, radius);
    g.lineStyle(width, color, 1).strokeCircle(0, 0, radius);
    g.setScale(0.25);
    this.scene.tweens.add({
      targets: g,
      scale: 1,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  slam(x: number, y: number, radius: number): void {
    this.ring(x, y, radius, PALETTE.slam, 10, 420, 0.18);
    this.ring(x, y, radius * 0.6, 0xffffff, 4, 260);
    this.dust.explode(46, x, y);
    // Ground crack decal that lingers briefly.
    const g = this.scene.add.graphics({ x, y }).setDepth(2);
    g.lineStyle(3, 0x0a0608, 0.9);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
      const r = radius * (0.45 + Math.random() * 0.4);
      g.lineBetween(Math.cos(a) * 12, Math.sin(a) * 12, Math.cos(a) * r, Math.sin(a) * r);
    }
    this.scene.tweens.add({ targets: g, alpha: 0, delay: 600, duration: 900, onComplete: () => g.destroy() });
  }

  wrathStart(x: number, y: number): void {
    this.ring(x, y, 90, PALETTE.wrath, 6, 400, 0.25);
    this.holy.explode(30, x, y);
  }

  wrathPulse(x: number, y: number, radius: number): void {
    this.ring(x, y, radius, PALETTE.wrath, 4, 320);
    this.holy.explode(8, x, y);
  }

  hitSpark(x: number, y: number, crit: boolean): void {
    this.sparks.explode(crit ? 10 : 4, x, y);
  }

  death(x: number, y: number): void {
    this.souls.explode(12, x, y);
  }

  afterimage(texture: string, x: number, y: number, rotation: number): void {
    const img = this.scene.add
      .image(x, y, texture)
      .setRotation(rotation)
      .setTint(PALETTE.dodge)
      .setAlpha(0.55)
      .setBlendMode('ADD')
      .setDepth(19);
    this.scene.tweens.add({ targets: img, alpha: 0, duration: 260, onComplete: () => img.destroy() });
  }

  damageNumber(slot: number, x: number, y: number, amount: number, crit: boolean): void {
    if (!this.damageNumbersEnabled) return;
    const existing = this.numbers.find((n) => n.slot === slot && n.age < MERGE_WINDOW_MS);
    if (existing) {
      existing.amount += amount;
      existing.crit ||= crit;
      this.styleNumber(existing);
      return;
    }
    // Under heavy load only crits get a number, to keep the screen readable.
    if (!crit && this.numbers.length >= CROWDED_NUMBERS) return;
    if (this.numbers.length >= MAX_NUMBERS) {
      if (!crit) return;
      this.recycle(0);
    }
    const text =
      this.freeTexts.pop() ??
      this.scene.add.text(0, 0, '', {
        fontFamily: FONT_UI,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      });
    text.setOrigin(0.5).setDepth(40).setVisible(true).setAlpha(1);
    text.setPosition(x + (Math.random() - 0.5) * 16, y - 18);
    const n: DamageNumber = {
      text,
      slot,
      amount,
      age: 0,
      life: crit ? 750 : 560,
      vy: crit ? -70 : -55,
      crit,
    };
    this.styleNumber(n);
    this.numbers.push(n);
  }

  private styleNumber(n: DamageNumber): void {
    n.text.setText(String(Math.round(n.amount)));
    n.text.setFontSize(n.crit ? 21 : 14);
    n.text.setColor(n.crit ? CSS.crit : '#ffffff');
  }

  private recycle(index: number): void {
    const [n] = this.numbers.splice(index, 1);
    if (!n) return;
    n.text.setVisible(false);
    this.freeTexts.push(n.text);
  }

  update(deltaMs: number): void {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i]!;
      n.age += deltaMs;
      n.text.y += (n.vy * deltaMs) / 1000;
      n.vy *= 0.94;
      const k = n.age / n.life;
      n.text.setAlpha(k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
      if (n.age >= n.life) this.recycle(i);
    }
  }

  clearNumbers(): void {
    while (this.numbers.length) this.recycle(this.numbers.length - 1);
  }
}
