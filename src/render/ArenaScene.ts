import Phaser from 'phaser';
import { CAMERA, loadSettings, saveSettings, type Settings } from '../data/settings';
import { SIM_CONFIG } from '../data/game';
import { KeyboardInput, type InputSource } from '../input/KeyboardInput';
import { InputRecorder } from '../sim/core/commands';
import type { SimEvent } from '../sim/core/events';
import { FixedStepLoop } from '../sim/core/loop';
import { Simulation } from '../sim/simulation';
import { Effects } from './Effects';
import { EnemyViews } from './EnemyViews';
import { PALETTE } from './palette';
import { PlayerView } from './PlayerView';
import { Sfx } from './sfx';

export const ARENA_SCENE = 'arena';

/** Emitted on game.events for the HUD. */
export const HudEvents = {
  playerHurt: 'hud:playerHurt',
  surge: 'hud:surge',
  restart: 'hud:restart',
} as const;

/**
 * Hosts one run: owns the Simulation, steps it at a fixed rate and renders
 * interpolated state. Contains no gameplay rules of its own.
 */
export class ArenaScene extends Phaser.Scene {
  sim!: Simulation;
  recorder!: InputRecorder;
  settings: Settings = loadSettings();
  paused = false;
  readonly sfx = new Sfx();

  private loop = new FixedStepLoop(1000 / SIM_CONFIG.tickRate, SIM_CONFIG.maxStepsPerFrame);
  private input$!: InputSource;
  private playerView!: PlayerView;
  private enemyViews!: EnemyViews;
  private effects!: Effects;
  private lookX = 0;
  private lookY = 0;
  private stepMsAvg = 0;
  private defeatHandled = false;

  constructor() {
    super(ARENA_SCENE);
  }

  /** Average simulation cost per tick (debug overlay). */
  get simStepMs(): number {
    return this.stepMsAvg;
  }

  create(data: { seed?: number }): void {
    const seed = data.seed ?? Date.now() >>> 0;
    this.sim = new Simulation({ seed });
    this.recorder = new InputRecorder(seed);
    this.loop.reset();
    this.paused = false;
    this.defeatHandled = false;
    this.lookX = this.lookY = 0;
    this.sfx.enabled = this.settings.sound;

    const arena = this.sim.world.arena;
    this.drawArena();

    this.effects = new Effects(this);
    this.effects.damageNumbersEnabled = this.settings.damageNumbers;
    this.enemyViews = new EnemyViews(this);
    this.playerView = new PlayerView(this, {
      base: 'vanguard_base',
      helmet: 'gear_helmet_iron',
      weapon: 'gear_weapon_heavysword',
    });

    this.input$ = new KeyboardInput();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input$.destroy());

    const cam = this.cameras.main;
    cam.setBackgroundColor(PALETTE.background);
    const margin = 200;
    cam.setBounds(-margin, -margin, arena.width + margin * 2, arena.height + margin * 2);
    const p = this.sim.player;
    this.playerView.container.setPosition(p.x, p.y);
    cam.startFollow(this.playerView.container, false, CAMERA.followLerp, CAMERA.followLerp);
    cam.centerOn(p.x, p.y);
    this.applyZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this),
    );
  }

  private applyZoom(): void {
    const h = this.scale.height;
    this.cameras.main.setZoom(Phaser.Math.Clamp(h / CAMERA.targetViewHeight, CAMERA.minZoom, CAMERA.maxZoom));
  }

  private drawArena(): void {
    const { width, height, obstacles } = this.sim.world.arena;
    this.add.tileSprite(0, 0, width, height, 'floor_tile').setOrigin(0).setDepth(0);

    const g = this.add.graphics().setDepth(1);
    const cx = width / 2;
    const cy = height / 2;
    // Central rune circle.
    g.lineStyle(3, PALETTE.rune, 0.35).strokeCircle(cx, cy, 300);
    g.lineStyle(1, PALETTE.rune, 0.25).strokeCircle(cx, cy, 270).strokeCircle(cx, cy, 160);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r0 = i % 2 ? 272 : 262;
      g.lineStyle(2, PALETTE.rune, 0.4).lineBetween(
        cx + Math.cos(a) * r0,
        cy + Math.sin(a) * r0,
        cx + Math.cos(a) * 298,
        cy + Math.sin(a) * 298,
      );
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const b = a + (Math.PI * 2) / 3;
      g.lineStyle(2, PALETTE.runeCorrupt, 0.3).lineBetween(
        cx + Math.cos(a) * 160,
        cy + Math.sin(a) * 160,
        cx + Math.cos(b) * 160,
        cy + Math.sin(b) * 160,
      );
    }
    this.add
      .image(cx, cy, 'glow')
      .setScale(5)
      .setTint(PALETTE.rune)
      .setAlpha(0.08)
      .setBlendMode('ADD')
      .setDepth(1);

    // Corrupted rift scars across the floor (decor only).
    const rnd = new Phaser.Math.RandomDataGenerator(['soulfall-decor']);
    for (let i = 0; i < 40; i++) {
      const x = rnd.between(150, width - 150);
      const y = rnd.between(150, height - 150);
      if (Math.hypot(x - cx, y - cy) < 360) continue;
      const len = rnd.between(30, 90);
      const a = rnd.angle() * (Math.PI / 180);
      g.lineStyle(3, PALETTE.runeCorrupt, 0.18).lineBetween(
        x,
        y,
        x + Math.cos(a) * len,
        y + Math.sin(a) * len,
      );
      g.lineStyle(1, PALETTE.huskCrack, 0.35).lineBetween(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
    }

    // Pillars.
    for (const o of obstacles) {
      g.fillStyle(0x000000, 0.4).fillCircle(o.x + 6, o.y + 8, o.r + 4);
      g.fillStyle(PALETTE.pillar).fillCircle(o.x, o.y, o.r);
      g.fillStyle(PALETTE.pillarTop).fillCircle(o.x - o.r * 0.15, o.y - o.r * 0.15, o.r * 0.72);
      g.lineStyle(2, PALETTE.rune, 0.55).strokeCircle(o.x, o.y, o.r * 0.42);
      this.add
        .image(o.x, o.y, 'glow')
        .setScale(o.r / 40)
        .setTint(PALETTE.rune)
        .setAlpha(0.12)
        .setBlendMode('ADD')
        .setDepth(1);
    }

    // Outer walls + glowing rift edge.
    const wall = 400;
    g.fillStyle(PALETTE.wall)
      .fillRect(-wall, -wall, width + wall * 2, wall)
      .fillRect(-wall, height, width + wall * 2, wall)
      .fillRect(-wall, 0, wall, height)
      .fillRect(width, 0, wall, height);
    g.lineStyle(4, PALETTE.wallEdge, 0.6).strokeRect(0, 0, width, height);
    g.lineStyle(12, PALETTE.wallEdge, 0.12).strokeRect(-6, -6, width + 12, height + 12);
  }

  override update(time: number, delta: number): void {
    if (!this.paused) {
      const alpha = this.loop.advance(delta, () => {
        const cmd = this.input$.sample();
        this.recorder.record(this.sim.world.tick, cmd);
        const t0 = performance.now();
        this.sim.step([cmd]);
        this.stepMsAvg = this.stepMsAvg * 0.95 + (performance.now() - t0) * 0.05;
      });
      for (const ev of this.sim.drainEvents()) this.handleEvent(ev, time);
      this.render(alpha, time, delta);
    }
  }

  private render(alpha: number, time: number, delta: number): void {
    const p = this.sim.player;
    const px = p.prevX + (p.x - p.prevX) * alpha;
    const py = p.prevY + (p.y - p.prevY) * alpha;
    this.playerView.update(p, px, py, time, delta);
    this.enemyViews.update(this.sim.world.enemies, p, alpha, time);
    this.effects.update(delta);

    // Camera look-ahead in the movement direction.
    const k = Math.min(1, (delta / 1000) * CAMERA.lookAheadSmoothing);
    const want = this.settings.lookAhead && p.moving && p.alive ? CAMERA.lookAheadDistance : 0;
    this.lookX += (p.facingX * want - this.lookX) * k;
    this.lookY += (p.facingY * want - this.lookY) * k;
    this.cameras.main.setFollowOffset(-this.lookX, -this.lookY);
  }

  private shake(duration: number, intensity: number): void {
    if (this.settings.screenShake) this.cameras.main.shake(duration, intensity);
  }

  private handleEvent(ev: SimEvent, time: number): void {
    switch (ev.type) {
      case 'swing':
        this.playerView.swing(ev.angle, ev.arc, 130);
        this.effects.slash(ev.x, ev.y, ev.angle, ev.arc, ev.range);
        this.sfx.play('swing');
        break;
      case 'enemyDamaged':
        this.enemyViews.flash(ev.slot, time);
        this.effects.hitSpark(ev.x, ev.y, ev.crit);
        this.effects.damageNumber(ev.slot, ev.x, ev.y, ev.amount, ev.crit);
        this.sfx.play(ev.crit ? 'crit' : 'hit');
        break;
      case 'enemyDied':
        this.effects.death(ev.x, ev.y);
        this.sfx.play('kill');
        break;
      case 'playerDamaged':
        this.playerView.flash(time);
        this.shake(110, 0.004);
        this.sfx.play('hurt');
        this.game.events.emit(HudEvents.playerHurt);
        break;
      case 'playerDied':
        this.shake(400, 0.01);
        this.sfx.play('death');
        break;
      case 'dodge': {
        const p = this.sim.player;
        this.sfx.play('dodge');
        for (let i = 0; i < 4; i++) {
          this.time.delayedCall(i * 35, () =>
            this.effects.afterimage('vanguard_base', p.x, p.y, Math.atan2(ev.dirY, ev.dirX)),
          );
        }
        break;
      }
      case 'slam':
        this.effects.slam(ev.x, ev.y, ev.radius);
        this.shake(220, 0.012);
        this.sfx.play('slam');
        break;
      case 'wrathStart':
        this.effects.wrathStart(this.sim.player.x, this.sim.player.y);
        this.sfx.play('wrath');
        break;
      case 'wrathPulse':
        this.effects.wrathPulse(ev.x, ev.y, ev.radius);
        this.sfx.play('pulse');
        break;
      case 'surge':
        this.game.events.emit(HudEvents.surge);
        break;
      case 'enemyWindup':
      case 'wrathEnd':
        break;
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) this.loop.reset();
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    this.sfx.enabled = this.settings.sound;
    this.effects.damageNumbersEnabled = this.settings.damageNumbers;
    if (!this.settings.damageNumbers) this.effects.clearNumbers();
  }

  /** True once per run, the first frame the run is lost. */
  consumeDefeat(): boolean {
    if (this.sim.world.state !== 'defeat' || this.defeatHandled) return false;
    this.defeatHandled = true;
    return true;
  }

  restart(): void {
    this.scene.restart({ seed: (Date.now() >>> 0) ^ 0x9e3779b9 });
  }
}
