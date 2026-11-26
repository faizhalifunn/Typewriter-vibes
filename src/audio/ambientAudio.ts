import type { AmbientChannelId, AmbientMixerState } from '../types';

interface ChannelBus {
  gain: GainNode;
  nodes: AudioNode[];
  timers: number[];
  active: boolean;
}

/**
 * Pure Web Audio API multi-channel simultaneous ambient soundscape mixer.
 * Supports layering Rain, Felt Piano, Fireplace, Vinyl, and Busy Cafe/Crowd simultaneously.
 * Zero external audio URLs -> instant playback, gapless loops, 100% offline-safe.
 */
class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterVolume = 0.55;
  private mixer: AmbientMixerState = {
    rain: 0,
    lofi_piano: 0,
    fireplace: 0,
    vinyl: 0,
    crowd: 0,
  };

  private channels: Partial<Record<AmbientChannelId, ChannelBus>> = {};

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = Math.max(0.0001, this.masterVolume * 0.65);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMasterVolume(volumePercent: number) {
    this.masterVolume = Math.max(0, Math.min(1, volumePercent / 100));
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(Math.max(0.0001, this.masterVolume * 0.65), now, 0.12);
    }
  }

  public setMix(nextMixer: AmbientMixerState, masterVolumePercent: number) {
    this.mixer = { ...nextMixer };
    this.masterVolume = Math.max(0, Math.min(1, masterVolumePercent / 100));

    const channelIds: AmbientChannelId[] = ['rain', 'lofi_piano', 'fireplace', 'vinyl', 'crowd'];
    const anyActive = channelIds.some((id) => (nextMixer[id] ?? 0) > 0);

    if (!anyActive) {
      this.stopAll();
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(Math.max(0.0001, this.masterVolume * 0.65), now, 0.12);

    for (const id of channelIds) {
      const level = Math.max(0, Math.min(1, (nextMixer[id] ?? 0) / 100));
      const existing = this.channels[id];

      if (level <= 0.001) {
        if (existing) {
          this.stopChannel(id);
        }
        continue;
      }

      if (!existing) {
        this.startChannel(ctx, id, level);
      } else {
        existing.gain.gain.cancelScheduledValues(now);
        existing.gain.gain.setTargetAtTime(level, now, 0.14);
      }
    }
  }

  public stopAll() {
    (Object.keys(this.channels) as AmbientChannelId[]).forEach((id) => {
      this.stopChannel(id);
    });
  }

  private stopChannel(id: AmbientChannelId) {
    const bus = this.channels[id];
    if (!bus) return;
    bus.active = false;
    delete this.channels[id];

    bus.timers.forEach((t) => window.clearInterval(t));
    bus.timers = [];

    if (this.ctx) {
      const now = this.ctx.currentTime;
      try {
        bus.gain.gain.cancelScheduledValues(now);
        bus.gain.gain.setTargetAtTime(0.0001, now, 0.08);
      } catch {
        // ignore
      }
    }

    const nodes = [...bus.nodes, bus.gain];
    window.setTimeout(() => {
      nodes.forEach((node) => {
        try {
          if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            (node as AudioScheduledSourceNode).stop();
          }
          node.disconnect();
        } catch {
          // ignore
        }
      });
    }, 280);
  }

  private startChannel(ctx: AudioContext, id: AmbientChannelId, initialLevel: number) {
    if (!this.masterGain) return;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(initialLevel, now + 0.65);
    gain.connect(this.masterGain);

    const bus: ChannelBus = {
      gain,
      nodes: [],
      timers: [],
      active: true,
    };
    this.channels[id] = bus;

    switch (id) {
      case 'rain':
        this.buildRain(ctx, bus);
        break;
      case 'lofi_piano':
        this.buildLofiPiano(ctx, bus);
        break;
      case 'fireplace':
        this.buildFireplace(ctx, bus);
        break;
      case 'vinyl':
        this.buildVinyl(ctx, bus);
        break;
      case 'crowd':
        this.buildCrowdAmbience(ctx, bus);
        break;
    }
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

  private buildRain(ctx: AudioContext, bus: ChannelBus) {
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

    const g = ctx.createGain();
    g.gain.value = 0.54;

    src.connect(lp);
    lp.connect(hp);
    hp.connect(g);
    g.connect(bus.gain);
    src.start();
    bus.nodes.push(src, lp, hp, g);

    const brownBuf = this.createColoredNoiseBuffer(ctx, 4.0, 'brown');
    const rumble = ctx.createBufferSource();
    rumble.buffer = brownBuf;
    rumble.loop = true;

    const rFilter = ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.value = 340;

    const rGain = ctx.createGain();
    rGain.gain.value = 0.26;

    rumble.connect(rFilter);
    rFilter.connect(rGain);
    rGain.connect(bus.gain);
    rumble.start();
    bus.nodes.push(rumble, rFilter, rGain);

    const dropTimer = window.setInterval(() => {
      if (!bus.active || Math.random() > 0.65) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const dGain = ctx.createGain();
      const f = 900 + Math.random() * 1400;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.35, now + 0.035);
      dGain.gain.setValueAtTime(0.0001, now);
      dGain.gain.linearRampToValueAtTime(0.022, now + 0.004);
      dGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      osc.connect(dGain);
      dGain.connect(bus.gain);
      osc.start(now);
      osc.stop(now + 0.05);
    }, 320);
    bus.timers.push(dropTimer);
  }

  private buildFireplace(ctx: AudioContext, bus: ChannelBus) {
    const brownBuf = this.createColoredNoiseBuffer(ctx, 4.0, 'brown');
    const src = ctx.createBufferSource();
    src.buffer = brownBuf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.28;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 75;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    const g = ctx.createGain();
    g.gain.value = 0.72;

    src.connect(lp);
    lp.connect(g);
    g.connect(bus.gain);
    src.start();
    lfo.start();
    bus.nodes.push(src, lp, lfo, lfoGain, g);

    const crackleTimer = window.setInterval(() => {
      if (!bus.active || Math.random() > 0.44) return;
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
      cGain.connect(bus.gain);
      cSrc.start(now);
    }, 190);
    bus.timers.push(crackleTimer);
  }

  private buildVinyl(ctx: AudioContext, bus: ChannelBus) {
    const pinkBuf = this.createColoredNoiseBuffer(ctx, 3.0, 'pink');
    const hiss = ctx.createBufferSource();
    hiss.buffer = pinkBuf;
    hiss.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 2400;
    hp.Q.value = 0.8;

    const hGain = ctx.createGain();
    hGain.gain.value = 0.095;

    hiss.connect(hp);
    hp.connect(hGain);
    hGain.connect(bus.gain);
    hiss.start();
    bus.nodes.push(hiss, hp, hGain);

    // Subtle analog warm hum
    const freqs = [130.81, 196.0];
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 460;
    lp.connect(bus.gain);
    bus.nodes.push(lp);

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = idx === 0 ? 0.04 : 0.022;
      osc.connect(g);
      g.connect(lp);
      osc.start();
      bus.nodes.push(osc, g);
    });

    const dustTimer = window.setInterval(() => {
      if (!bus.active || Math.random() > 0.38) return;
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
      g.gain.value = 0.08 + Math.random() * 0.14;

      src.connect(f);
      f.connect(g);
      g.connect(bus.gain);
      src.start(now);
    }, 230);
    bus.timers.push(dustTimer);
  }

  private buildLofiPiano(ctx: AudioContext, bus: ChannelBus) {
    const chords: number[][] = [
      [130.81, 196.0, 246.94, 293.66, 329.63], // Cmaj9
      [110.0, 164.81, 196.0, 246.94, 329.63], // Am9
      [87.31, 130.81, 164.81, 196.0, 261.63], // Fmaj9
      [98.0, 146.83, 174.61, 220.0, 293.66], // G13sus4
      [146.83, 220.0, 261.63, 329.63, 349.23], // Dm9
      [164.81, 246.94, 293.66, 329.63, 392.0], // Em7
    ];

    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.value = 980;
    warmthFilter.connect(bus.gain);
    bus.nodes.push(warmthFilter);

    let step = 0;
    const playChord = () => {
      if (!bus.active) return;
      const chord = chords[step % chords.length];
      step++;
      const now = ctx.currentTime;

      chord.forEach((freq, i) => {
        const noteStart = now + i * 0.085 + Math.random() * 0.02;
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 6, noteStart);

        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2, noteStart);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.value = 0.14;

        noteGain.gain.setValueAtTime(0.0001, noteStart);
        noteGain.gain.linearRampToValueAtTime(0.075, noteStart + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.028, noteStart + 1.8);
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
    bus.timers.push(chordTimer);
  }

  /**
   * Procedural Bustling Cafe / Crowded Public Room Ambience (100% offline Web Audio API):
   * - Warm room acoustic floor
   * - 3 overlapping formant-filtered speech murmur bands with organic LFO cadence
   * - Occasional soft ceramic cup/saucer clinks & distant espresso steam bursts
   */
  private buildCrowdAmbience(ctx: AudioContext, bus: ChannelBus) {
    // 1. Warm room acoustic body (distant crowd hum)
    const brownBuf = this.createColoredNoiseBuffer(ctx, 5.0, 'brown');
    const roomSrc = ctx.createBufferSource();
    roomSrc.buffer = brownBuf;
    roomSrc.loop = true;

    const roomBp = ctx.createBiquadFilter();
    roomBp.type = 'bandpass';
    roomBp.frequency.value = 280;
    roomBp.Q.value = 0.65;

    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.34;

    roomSrc.connect(roomBp);
    roomBp.connect(roomGain);
    roomGain.connect(bus.gain);
    roomSrc.start();
    bus.nodes.push(roomSrc, roomBp, roomGain);

    // 2. Multi-band vocal formant chatter murmur (warm, unintelligible cafe voices)
    const pinkBuf = this.createColoredNoiseBuffer(ctx, 5.0, 'pink');
    const formantBands = [
      { freq: 440, q: 1.6, lfoHz: 0.37, depth: 110, level: 0.38 },
      { freq: 920, q: 2.1, lfoHz: 0.53, depth: 210, level: 0.28 },
      { freq: 1580, q: 2.4, lfoHz: 0.71, depth: 260, level: 0.14 },
    ];

    formantBands.forEach((band) => {
      const src = ctx.createBufferSource();
      src.buffer = pinkBuf;
      src.loop = true;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = band.freq;
      bp.Q.value = band.q;

      // Subtle speech-cadence amplitude & formant swell
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = band.lfoHz;
      const lfoFreqGain = ctx.createGain();
      lfoFreqGain.gain.value = band.depth;
      lfo.connect(lfoFreqGain);
      lfoFreqGain.connect(bp.frequency);

      const ampLfo = ctx.createOscillator();
      ampLfo.type = 'sine';
      ampLfo.frequency.value = band.lfoHz * 1.45;
      const ampLfoGain = ctx.createGain();
      ampLfoGain.gain.value = band.level * 0.28;

      const chGain = ctx.createGain();
      chGain.gain.value = band.level;
      ampLfo.connect(ampLfoGain);
      ampLfoGain.connect(chGain.gain);

      src.connect(bp);
      bp.connect(chGain);
      chGain.connect(bus.gain);

      src.start(0, Math.random() * 2.5);
      lfo.start();
      ampLfo.start();
      bus.nodes.push(src, bp, lfo, lfoFreqGain, ampLfo, ampLfoGain, chGain);
    });

    // 3. Soft conversational voice swells + occasional ceramic cup clinks & distant steam
    const cafeDetailTimer = window.setInterval(() => {
      if (!bus.active) return;
      const roll = Math.random();
      const now = ctx.currentTime;

      if (roll < 0.22) {
        // Distant porcelain coffee cup / spoon clink
        const base = 2450 + Math.random() * 1450;
        [1, 1.84, 2.72].forEach((ratio, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(base * ratio, now);
          const peak = idx === 0 ? 0.032 : idx === 1 ? 0.018 : 0.009;
          g.gain.setValueAtTime(0.0001, now);
          g.gain.linearRampToValueAtTime(peak, now + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14 + Math.random() * 0.09);
          osc.connect(g);
          g.connect(bus.gain);
          osc.start(now);
          osc.stop(now + 0.26);
        });
      } else if (roll < 0.45) {
        // Brief distant voice cadence murmur swell
        const dur = 0.28 + Math.random() * 0.36;
        const src = ctx.createBufferSource();
        src.buffer = pinkBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(480 + Math.random() * 620, now);
        bp.frequency.linearRampToValueAtTime(420 + Math.random() * 480, now + dur);
        bp.Q.value = 3.2;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.085, now + dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        src.connect(bp);
        bp.connect(g);
        g.connect(bus.gain);
        src.start(now, Math.random() * 3.5, dur + 0.05);
      } else if (roll > 0.94) {
        // Subtle distant espresso machine steam release
        const dur = 0.65 + Math.random() * 0.55;
        const src = ctx.createBufferSource();
        src.buffer = pinkBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2600;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 5400;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.024, now + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        src.connect(hp);
        hp.connect(lp);
        lp.connect(g);
        g.connect(bus.gain);
        src.start(now, Math.random() * 2.5, dur + 0.05);
      }
    }, 850);
    bus.timers.push(cafeDetailTimer);
  }
}

export const ambientAudio = new AmbientAudioEngine();
