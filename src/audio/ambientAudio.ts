import type { AmbientTrackId } from '../types';

/**
 * Pure Web Audio API generative ambient soundscape & lo-fi music engine.
 * Zero external audio URLs -> instant playback, gapless loops, offline-safe.
 */
class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: AmbientTrackId = 'off';
  private volume = 0.42;

  private activeNodes: AudioNode[] = [];
  private timers: number[] = [];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(volumePercent: number) {
    this.volume = Math.max(0, Math.min(1, volumePercent / 100));
    if (this.ctx && this.masterGain && this.currentTrack !== 'off') {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(Math.max(0.0001, this.volume * 0.55), now, 0.15);
    }
  }

  public setTrack(track: AmbientTrackId, volumePercent: number) {
    this.volume = Math.max(0, Math.min(1, volumePercent / 100));
    if (track === this.currentTrack) {
      this.setVolume(volumePercent);
      return;
    }

    this.stopCurrent();
    this.currentTrack = track;
    if (track === 'off') return;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0.0001, now);
    this.masterGain.gain.linearRampToValueAtTime(Math.max(0.0001, this.volume * 0.55), now + 1.1);

    switch (track) {
      case 'rain':
        this.startRain(ctx, this.masterGain, 1.0);
        break;
      case 'lofi_piano':
        this.startLofiPiano(ctx, this.masterGain, 1.0);
        this.startVinylCrackle(ctx, this.masterGain, 0.25);
        break;
      case 'fireplace':
        this.startFireplace(ctx, this.masterGain);
        break;
      case 'rainy_cafe':
        this.startRain(ctx, this.masterGain, 0.62);
        this.startLofiPiano(ctx, this.masterGain, 0.68);
        break;
      case 'vinyl':
        this.startVinylCrackle(ctx, this.masterGain, 0.9);
        this.startWarmDrone(ctx, this.masterGain);
        break;
    }
  }

  public stopCurrent() {
    this.timers.forEach((id) => window.clearInterval(id));
    this.timers = [];

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.08);
    }

    const nodesToStop = [...this.activeNodes];
    this.activeNodes = [];
    window.setTimeout(() => {
      nodesToStop.forEach((node) => {
        try {
          if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            (node as AudioScheduledSourceNode).stop();
          }
          node.disconnect();
        } catch {
          // Ignore already-stopped nodes
        }
      });
    }, 260);
  }

  private createColoredNoiseBuffer(ctx: AudioContext, seconds: number, color: 'pink' | 'brown') {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const out = buffer.getChannelData(ch);
      if (color === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
          b6 = white * 0.115926;
        }
      } else {
        let last = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          out[i] = last * 1.9;
        }
      }
    }
    return buffer;
  }

  private startRain(ctx: AudioContext, dest: AudioNode, level: number) {
    const pinkBuf = this.createColoredNoiseBuffer(ctx, 4.0, 'pink');
    const src = ctx.createBufferSource();
    src.buffer = pinkBuf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1850;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 260;

    const gain = ctx.createGain();
    gain.gain.value = 0.55 * level;

    src.connect(lp);
    lp.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    src.start();
    this.activeNodes.push(src, lp, hp, gain);

    // Subtle deep outdoor rain body
    const brownBuf = this.createColoredNoiseBuffer(ctx, 4.0, 'brown');
    const rumble = ctx.createBufferSource();
    rumble.buffer = brownBuf;
    rumble.loop = true;

    const rFilter = ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.value = 340;

    const rGain = ctx.createGain();
    rGain.gain.value = 0.28 * level;

    rumble.connect(rFilter);
    rFilter.connect(rGain);
    rGain.connect(dest);
    rumble.start();
    this.activeNodes.push(rumble, rFilter, rGain);

    // Occasional gentle raindrops tapping window glass
    const dropTimer = window.setInterval(() => {
      if (this.currentTrack !== 'rain' && this.currentTrack !== 'rainy_cafe') return;
      if (Math.random() > 0.65) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const dGain = ctx.createGain();
      const f = 900 + Math.random() * 1400;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.35, now + 0.035);
      dGain.gain.setValueAtTime(0.0001, now);
      dGain.gain.linearRampToValueAtTime(0.022 * level, now + 0.004);
      dGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      osc.connect(dGain);
      dGain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.05);
    }, 320);
    this.timers.push(dropTimer);
  }

  private startFireplace(ctx: AudioContext, dest: AudioNode) {
    const brownBuf = this.createColoredNoiseBuffer(ctx, 4.0, 'brown');
    const src = ctx.createBufferSource();
    src.buffer = brownBuf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;

    // Gentle flame swell modulation
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.28;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 75;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    const gain = ctx.createGain();
    gain.gain.value = 0.72;

    src.connect(lp);
    lp.connect(gain);
    gain.connect(dest);
    src.start();
    lfo.start();
    this.activeNodes.push(src, lp, lfo, lfoGain, gain);

    // Organic wood crackles and pops
    const crackleTimer = window.setInterval(() => {
      if (this.currentTrack !== 'fireplace') return;
      if (Math.random() > 0.42) return;
      const now = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 0.015);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.003));
      }
      const cSrc = ctx.createBufferSource();
      cSrc.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 3400;
      bp.Q.value = 2.0;

      const cGain = ctx.createGain();
      cGain.gain.value = 0.14 + Math.random() * 0.24;

      cSrc.connect(bp);
      bp.connect(cGain);
      cGain.connect(dest);
      cSrc.start(now);
    }, 190);
    this.timers.push(crackleTimer);
  }

  private startVinylCrackle(ctx: AudioContext, dest: AudioNode, level: number) {
    const pinkBuf = this.createColoredNoiseBuffer(ctx, 3.0, 'pink');
    const hiss = ctx.createBufferSource();
    hiss.buffer = pinkBuf;
    hiss.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 2400;
    hp.Q.value = 0.8;

    const hGain = ctx.createGain();
    hGain.gain.value = 0.09 * level;

    hiss.connect(hp);
    hp.connect(hGain);
    hGain.connect(dest);
    hiss.start();
    this.activeNodes.push(hiss, hp, hGain);

    const dustTimer = window.setInterval(() => {
      if (this.currentTrack !== 'vinyl' && this.currentTrack !== 'lofi_piano') return;
      if (Math.random() > 0.35) return;
      const now = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 0.006);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.0012));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 2800;

      const g = ctx.createGain();
      g.gain.value = (0.08 + Math.random() * 0.12) * level;

      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(now);
    }, 240);
    this.timers.push(dustTimer);
  }

  private startWarmDrone(ctx: AudioContext, dest: AudioNode) {
    // Gentle analog warm tape chord bed (C3 + G3 + D4 soft sine)
    const freqs = [130.81, 196.0, 293.66];
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.connect(dest);
    this.activeNodes.push(lp);

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;

      const g = ctx.createGain();
      g.gain.value = idx === 0 ? 0.08 : 0.045;

      osc.connect(g);
      g.connect(lp);
      osc.start();
      this.activeNodes.push(osc, g);
    });
  }

  private startLofiPiano(ctx: AudioContext, dest: AudioNode, level: number) {
    // Warm, calm felt-piano jazz voicings (Hz)
    const chords: number[][] = [
      [130.81, 196.0, 246.94, 293.66, 329.63], // Cmaj9
      [110.0, 164.81, 196.0, 246.94, 329.63],  // Am9
      [87.31, 130.81, 164.81, 196.0, 261.63],  // Fmaj9
      [98.0, 146.83, 174.61, 220.0, 293.66],   // G13sus4
      [146.83, 220.0, 261.63, 329.63, 349.23], // Dm9
      [164.81, 246.94, 293.66, 329.63, 392.0], // Em7
    ];

    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.value = 980;
    warmthFilter.connect(dest);
    this.activeNodes.push(warmthFilter);

    let step = 0;

    const playChord = () => {
      if (this.currentTrack !== 'lofi_piano' && this.currentTrack !== 'rainy_cafe') return;
      const chord = chords[step % chords.length];
      step++;
      const now = ctx.currentTime;

      chord.forEach((freq, i) => {
        // Gentle arpeggiated human strum
        const noteStart = now + i * 0.085 + Math.random() * 0.02;
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);
        // Subtle lo-fi tape pitch drift
        osc.detune.setValueAtTime((Math.random() - 0.5) * 6, noteStart);

        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2, noteStart);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.value = 0.14;

        noteGain.gain.setValueAtTime(0.0001, noteStart);
        noteGain.gain.linearRampToValueAtTime(0.075 * level, noteStart + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.028 * level, noteStart + 1.8);
        noteGain.gain.exponentialRampToValueAtTime(0.0002, noteStart + 4.8);

        osc.connect(noteGain);
        overtone.connect(overtoneGain);
        overtoneGain.connect(noteGain);
        noteGain.connect(warmthFilter);

        osc.start(noteStart);
        overtone.start(noteStart);
        osc.stop(noteStart + 5.0);
        overtone.stop(noteStart + 5.0);
      });
    };

    playChord();
    const chordTimer = window.setInterval(playChord, 5200);
    this.timers.push(chordTimer);
  }
}

export const ambientAudio = new AmbientAudioEngine();
