// Procedural audio using the Web Audio API.
// No external sound files needed — everything is synthesized on the fly.
// Exposes a simple API: click, rollClatter, cupCover, diceReveal, damage, heal, victory, horn, toggleAmbient

type SoundName =
  | 'click'
  | 'shake'
  | 'cupCover'
  | 'diceReveal'
  | 'block'
  | 'damage'
  | 'heal'
  | 'victory'
  | 'defeat'
  | 'horn';

interface AmbientNodes {
  osc: OscillatorNode;
  osc2: OscillatorNode;
  gain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  filter: BiquadFilterNode;
}

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  ambient: AmbientNodes | null = null;
  ambientOn = false;
  muted = false;

  async ensure(): Promise<AudioContext> {
    if (!this.ctx) {
      // @ts-expect-error vendor prefix safety
      const AC: typeof AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(m ? 0 : 0.8, this.ctx.currentTime + 0.1);
    }
  }

  async play(name: SoundName) {
    if (this.muted) return;
    try {
      const ctx = await this.ensure();
      switch (name) {
        case 'click': this.clickSfx(ctx); break;
        case 'shake': this.shakeSfx(ctx); break;
        case 'cupCover': this.cupCoverSfx(ctx); break;
        case 'diceReveal': this.diceRevealSfx(ctx); break;
        case 'block': this.blockSfx(ctx); break;
        case 'damage': this.damageSfx(ctx); break;
        case 'heal': this.healSfx(ctx); break;
        case 'victory': this.victorySfx(ctx); break;
        case 'defeat': this.defeatSfx(ctx); break;
        case 'horn': this.hornSfx(ctx); break;
      }
    } catch {
      // ignore
    }
  }

  async toggleAmbient(on: boolean) {
    const ctx = await this.ensure();
    if (on && !this.ambientOn) {
      this.startAmbient(ctx);
      this.ambientOn = true;
    } else if (!on && this.ambientOn && this.ambient) {
      const { osc, osc2, gain, lfo } = this.ambient;
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        try { osc.stop(); osc2.stop(); lfo.stop(); } catch { /* noop */ }
      }, 1100);
      this.ambient = null;
      this.ambientOn = false;
    }
  }

  private startAmbient(ctx: AudioContext) {
    // Deep drone + slow heartbeat drum
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 82.4; // E2
    // Slow LFO wobbling the filter cutoff
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 150;

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    lfo.connect(lfoGain).connect(filter.frequency);
    osc.start();
    osc2.start();
    lfo.start();
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 2.5);

    // Drum pulses every ~3.5s
    const beat = () => {
      if (!this.ambientOn || !this.ctx) return;
      this.drumHit(this.ctx, this.ctx.currentTime, 0.28);
      setTimeout(beat, 3300 + Math.random() * 500);
    };
    setTimeout(beat, 2000);

    this.ambient = { osc, osc2, gain, lfo, lfoGain, filter };
  }

  private drumHit(ctx: AudioContext, t: number, vol = 0.3) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  private clickSfx(ctx: AudioContext) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(320, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(this.master!);
    o.start(t); o.stop(t + 0.15);
  }

  private cupCoverSfx(ctx: AudioContext) {
    // Soft wooden thud
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(this.master!);
    o.start(t); o.stop(t + 0.4);
  }

  private shakeSfx(ctx: AudioContext) {
    // Dry wooden rattle: low filtered scrape plus uneven cup knocks.
    const t0 = ctx.currentTime;
    const duration = 1.05;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const time = i / ctx.sampleRate;
      const chatter = Math.max(0, Math.sin(time * Math.PI * 2 * 11 + Math.sin(time * 31) * 0.8));
      const scrape = 0.35 + Math.random() * 0.65;
      data[i] = (Math.random() * 2 - 1) * Math.pow(chatter, 1.9) * scrape;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const body = ctx.createBiquadFilter();
    body.type = 'bandpass';
    body.frequency.value = 620;
    body.Q.value = 1.1;
    const duller = ctx.createBiquadFilter();
    duller.type = 'lowpass';
    duller.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + 0.06);
    g.gain.linearRampToValueAtTime(0.0, t0 + duration);
    src.connect(body).connect(duller).connect(g).connect(this.master!);
    src.start(t0); src.stop(t0 + duration + 0.1);

    for (let i = 0; i < 10; i++) {
      const t = t0 + 0.05 + i * 0.095 + Math.random() * 0.025;
      const knock = ctx.createOscillator();
      const knockGain = ctx.createGain();
      const knockFilter = ctx.createBiquadFilter();
      knock.type = i % 3 === 0 ? 'triangle' : 'sine';
      knock.frequency.setValueAtTime(150 + Math.random() * 90, t);
      knock.frequency.exponentialRampToValueAtTime(55 + Math.random() * 24, t + 0.075);
      knockFilter.type = 'lowpass';
      knockFilter.frequency.value = 780;
      knockGain.gain.setValueAtTime(0.11 + Math.random() * 0.08, t);
      knockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      knock.connect(knockFilter).connect(knockGain).connect(this.master!);
      knock.start(t);
      knock.stop(t + 0.13);
    }
  }

  private diceRevealSfx(ctx: AudioContext) {
    // Six quick wooden clacks
    for (let i = 0; i < 6; i++) {
      const t = ctx.currentTime + i * 0.06;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      const base = 380 + Math.random() * 120;
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 0.3, t + 0.08);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(this.master!);
      o.start(t); o.stop(t + 0.12);
    }
  }

  private damageSfx(ctx: AudioContext) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(this.master!);
    o.start(t); o.stop(t + 0.4);
  }

  private blockSfx(ctx: AudioContext) {
    const t = ctx.currentTime;
    const wood = ctx.createOscillator();
    const woodGain = ctx.createGain();
    wood.type = 'triangle';
    wood.frequency.setValueAtTime(210, t);
    wood.frequency.exponentialRampToValueAtTime(92, t + 0.18);
    woodGain.gain.setValueAtTime(0.18, t);
    woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    wood.connect(woodGain).connect(this.master!);
    wood.start(t);
    wood.stop(t + 0.25);

    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.type = 'square';
    ring.frequency.setValueAtTime(860, t + 0.01);
    ring.frequency.exponentialRampToValueAtTime(280, t + 0.12);
    ringGain.gain.setValueAtTime(0.08, t + 0.01);
    ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    ring.connect(ringGain).connect(this.master!);
    ring.start(t + 0.01);
    ring.stop(t + 0.16);
  }

  private healSfx(ctx: AudioContext) {
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C, E, G
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const st = t + i * 0.09;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.12, st + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
      o.connect(g).connect(this.master!);
      o.start(st); o.stop(st + 0.4);
    });
  }

  private hornSfx(ctx: AudioContext) {
    // Low brass-like horn with vibrato
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 146.83; // D3
    o2.type = 'square'; o2.frequency.value = 220.0; // A3
    vib.frequency.value = 5; vibGain.gain.value = 2;
    vib.connect(vibGain).connect(o.frequency);
    vib.connect(vibGain).connect(o2.frequency);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.2);
    g.gain.setValueAtTime(0.2, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(this.master!);
    o.start(t); o2.start(t); vib.start(t);
    o.stop(t + 1.7); o2.stop(t + 1.7); vib.stop(t + 1.7);
  }

  private victorySfx(ctx: AudioContext) {
    const t = ctx.currentTime;
    const melody = [261.63, 329.63, 392.0, 523.25, 659.25];
    melody.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const st = t + i * 0.14;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.18, st + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.5);
      o.connect(g).connect(this.master!);
      o.start(st); o.stop(st + 0.55);
    });
    // closing horn
    setTimeout(() => this.hornSfx(ctx), 900);
  }

  private defeatSfx(ctx: AudioContext) {
    const t = ctx.currentTime;
    const melody = [261.63, 246.94, 220.0, 196.0];
    melody.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      const st = t + i * 0.22;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.14, st + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.7);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 700;
      o.connect(lp).connect(g).connect(this.master!);
      o.start(st); o.stop(st + 0.75);
    });
  }
}

export const audio = new AudioEngine();
