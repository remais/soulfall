/**
 * Prototype sound effects synthesized with WebAudio (no audio files needed).
 * The AudioContext is created lazily on the first user gesture (browser autoplay rules).
 */
type SfxName = 'swing' | 'hit' | 'crit' | 'slam' | 'wrath' | 'pulse' | 'dodge' | 'hurt' | 'death' | 'kill';

const MIN_GAP_MS: Partial<Record<SfxName, number>> = { hit: 45, crit: 60, kill: 40, pulse: 80 };

export class Sfx {
  private ctx: AudioContext | undefined;
  private master: GainNode | undefined;
  private noise: AudioBuffer | undefined;
  private readonly lastPlayed = new Map<SfxName, number>();
  enabled = true;

  constructor() {
    const unlock = (): void => {
      this.ensure();
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  private ensure(): AudioContext | undefined {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = undefined;
    }
    return this.ctx;
  }

  play(name: SfxName): void {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const now = performance.now();
    const gap = MIN_GAP_MS[name];
    if (gap && now - (this.lastPlayed.get(name) ?? 0) < gap) return;
    this.lastPlayed.set(name, now);

    switch (name) {
      case 'swing':
        this.noiseBurst(0.12, 2400, 'bandpass', 0.25, 900);
        break;
      case 'hit':
        this.tone('square', 220, 90, 0.06, 0.12);
        this.noiseBurst(0.05, 3000, 'highpass', 0.12);
        break;
      case 'crit':
        this.tone('square', 520, 160, 0.09, 0.14);
        this.noiseBurst(0.07, 4000, 'highpass', 0.18);
        break;
      case 'slam':
        this.tone('sine', 120, 35, 0.45, 0.7);
        this.noiseBurst(0.35, 600, 'lowpass', 0.5, 120);
        break;
      case 'wrath':
        [392, 494, 587].forEach((f) => this.tone('triangle', f, f * 1.01, 0.7, 0.12));
        break;
      case 'pulse':
        this.tone('sine', 660, 440, 0.15, 0.08);
        break;
      case 'dodge':
        this.noiseBurst(0.16, 1200, 'bandpass', 0.18, 3200);
        break;
      case 'hurt':
        this.tone('sawtooth', 180, 70, 0.18, 0.2);
        break;
      case 'death':
        this.tone('sawtooth', 220, 40, 1.2, 0.3);
        break;
      case 'kill':
        this.tone('triangle', 300, 120, 0.1, 0.08);
        break;
    }
  }

  private tone(type: OscillatorType, from: number, to: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(dur: number, freq: number, type: BiquadFilterType, vol: number, sweepTo?: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}
