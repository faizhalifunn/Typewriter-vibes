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
  private masterVolume = 0.6;
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
      this.masterGain.gain.value = Math.max(0.0001, this.masterVolume * 0.85);
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
      this.masterGain.gain.setTargetAtTime(Math.max(0.0001, this.masterVolume * 0.85), now, 0.12);
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
    this.masterGain.gain.setTargetAtTime(Math.max(0.0001, this.masterVolume * 0.85), now, 0.12);

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
    gain.gain.linearRampToValueAtTime(initialLevel, now + 0.5);
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
          // Normalized rich pink noise level (clearly audible through bandpass filters)
          out[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.14));
          b6 = white * 0.115926;
        }
      } else {
        let last = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          out[i] = Math.max(-1, Math.min(1, last * 2.4));
        }
      }
    }
    return buffer;
  }

  /**
   * Rich, unmistakably clear Rain on Window Glass:
   * - Steady stereo outdoor rainfall body (warm mid-band pink noise)
   * - Crisp rain-patter layer on roof/leaves (upper mid sparkle with gentle wind swell)
   * - Soft distant low rain floor
   * - Frequent organic raindrop taps & water pings hitting the windowpane
   */
  private buildRain(ctx: AudioContext, bus: ChannelBus) {
    const pinkBuf = this.createColoredNoiseBuffer(ctx, 5.0, 'pink');

    // Layer 1: Main steady rainfall wash
    const mainSrc = ctx.createBufferSource();
    mainSrc.buffer = pinkBuf;
    mainSrc.loop = true;

    const mainLp = ctx.createBiquadFilter();
    mainLp.type = 'lowpass';
    mainLp.frequency.value = 2600;

    const mainHp = ctx.createBiquadFilter();
    mainHp.type = 'highpass';
    mainHp.frequency.value = 340;

    const mainGain = ctx.createGain();
    mainGain.gain.value = 0.72;

    mainSrc.connect(mainLp);
    mainLp.connect(mainHp);
    mainHp.connect(mainGain);
    mainGain.connect(bus.gain);
    mainSrc.start();
    bus.nodes.push(mainSrc, mainLp, mainHp, mainGain);

    // Layer 2: Crisp raindrop patter sparkle with slow wind-gust modulation
    const patterSrc = ctx.createBufferSource();
    patterSrc.buffer = pinkBuf;
    patterSrc.loop = true;

    const patterBp = ctx.createBiquadFilter();
    patterBp.type = 'bandpass';
    patterBp.frequency.value = 4200;
    patterBp.Q.value = 0.7;

    const patterGain = ctx.createGain();
    patterGain.gain.value = 0.34;

    const gustLfo = ctx.createOscillator();
    gustLfo.type = 'sine';
    gustLfo.frequency.value = 0.14;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 0.11;
    gustLfo.connect(gustDepth);
    gustDepth.connect(patterGain.gain);

    patterSrc.connect(patterBp);
    patterBp.connect(patterGain);
    patterGain.connect(bus.gain);
    patterSrc.start(0, 1.7);
    gustLfo.start();
    bus.nodes.push(patterSrc, patterBp, patterGain, gustLfo, gustDepth);

    // Layer 3: Soft distant outdoor rumble
    const brownBuf = this.createColoredNoiseBuffer(ctx, 4.0, 'brown');
    const rumble = ctx.createBufferSource();
    rumble.buffer = brownBuf;
    rumble.loop = true;

    const rFilter = ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.value = 260;

    const rGain = ctx.createGain();
    rGain.gain.value = 0.32;

    rumble.connect(rFilter);
    rFilter.connect(rGain);
    rGain.connect(bus.gain);
    rumble.start();
    bus.nodes.push(rumble, rFilter, rGain);

    // Layer 4: Frequent crisp raindrop taps hitting the window glass
    const dropTimer = window.setInterval(() => {
      if (!bus.active) return;
      const now = ctx.currentTime;

      // Short percussive droplet tap on glass
      if (Math.random() < 0.75) {
        const len = Math.floor(ctx.sampleRate * 0.012);
        const dBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const ch = dBuf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.0022));
        }
        const tap = ctx.createBufferSource();
        tap.buffer = dBuf;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2200 + Math.random() * 3200;
        bp.Q.value = 2.6;

        const dGain = ctx.createGain();
        dGain.gain.value = 0.14 + Math.random() * 0.16;

        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) {
          pan.pan.value = (Math.random() - 0.5) * 1.4;
          tap.connect(bp);
          bp.connect(dGain);
          dGain.connect(pan);
          pan.connect(bus.gain);
        } else {
          tap.connect(bp);
          bp.connect(dGain);
          dGain.connect(bus.gain);
        }
        tap.start(now + Math.random() * 0.04);
      }

      // Occasional resonant water droplet plink
      if (Math.random() < 0.35) {
        const osc = ctx.createOscillator();
        const pGain = ctx.createGain();
        const f = 1100 + Math.random() * 1400;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 1.45, now + 0.032);
        pGain.gain.setValueAtTime(0.0001, now);
        pGain.gain.linearRampToValueAtTime(0.038, now + 0.003);
        pGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
        osc.connect(pGain);
        pGain.connect(bus.gain);
        osc.start(now);
        osc.stop(now + 0.048);
      }
    }, 115);
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
    g.gain.value = 0.65;

    src.connect(lp);
    lp.connect(g);
    g.connect(bus.gain);
    src.start();
    lfo.start();
    bus.nodes.push(src, lp, lfo, lfoGain, g);

    const crackleTimer = window.setInterval(() => {
      if (!bus.active || Math.random() > 0.48) return;
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
      cGain.gain.value = 0.16 + Math.random() * 0.24;

      cSrc.connect(bp);
      bp.connect(cGain);
      cGain.connect(bus.gain);
      cSrc.start(now);
    }, 185);
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
    hGain.gain.value = 0.085;

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
      g.gain.value = idx === 0 ? 0.045 : 0.025;
      osc.connect(g);
      g.connect(lp);
      osc.start();
      bus.nodes.push(osc, g);
    });

    const dustTimer = window.setInterval(() => {
      if (!bus.active || Math.random() > 0.4) return;
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
      g.gain.value = 0.09 + Math.random() * 0.14;

      src.connect(f);
      f.connect(g);
      g.connect(bus.gain);
      src.start(now);
    }, 220);
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
        noteGain.gain.linearRampToValueAtTime(0.085, noteStart + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.032, noteStart + 1.8);
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
   * Authentic Bustling Cafe / Crowded Public Room Ambience (ZERO rain-like noise wash!):
   * - Soft, warm indoor hall reverberant body (low-mid only, no hiss)
   * - Overlapping multi-speaker procedural voice murmur using pitched glottal oscillators
   *   routed through dual vowel formant filters (F1/F2) with natural syllable phrasing & stereo pan
   * - Realistic cafe foley: ceramic cup/saucer clinks, spoon stirs, soft wooden table thuds
   */
  private buildCrowdAmbience(ctx: AudioContext, bus: ChannelBus) {
    // Master indoor room tone softener so voices feel naturally distant & cozy
    const roomLp = ctx.createBiquadFilter();
    roomLp.type = 'lowpass';
    roomLp.frequency.value = 1650;
    roomLp.connect(bus.gain);
    bus.nodes.push(roomLp);

    // 1. Very subtle low-mid room presence (strictly <= 360Hz, zero high-frequency rain hiss!)
    const brownBuf = this.createColoredNoiseBuffer(ctx, 5.0, 'brown');
    const roomSrc = ctx.createBufferSource();
    roomSrc.buffer = brownBuf;
    roomSrc.loop = true;

    const roomBp = ctx.createBiquadFilter();
    roomBp.type = 'bandpass';
    roomBp.frequency.value = 210;
    roomBp.Q.value = 1.2;

    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.14;

    roomSrc.connect(roomBp);
    roomBp.connect(roomGain);
    roomGain.connect(roomLp);
    roomSrc.start();
    bus.nodes.push(roomSrc, roomBp, roomGain);

    // Vowel formant presets (F1, F2) for muffled human conversational murmur
    const vowels: Array<[number, number]> = [
      [680, 1180], // "a"
      [480, 1650], // "e"
      [340, 1950], // "i"
      [460, 880],  // "o"
      [360, 760],  // "u"
      [540, 1340], // schwa
    ];

    // Helper: synthesize one natural muffled conversational phrase of 3–6 syllables
    const speakMuffledPhrase = (basePitch: number, panPos: number, loudness: number) => {
      if (!bus.active) return;
      const now = ctx.currentTime;
      const syllableCount = 3 + Math.floor(Math.random() * 4);
      let cursor = now + Math.random() * 0.08;

      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = panPos;
        pan.connect(roomLp);
      }
      const dest: AudioNode = pan ?? roomLp;

      for (let s = 0; s < syllableCount; s++) {
        const dur = 0.095 + Math.random() * 0.115;
        const gap = 0.025 + Math.random() * 0.055;
        const [f1Freq, f2Freq] = vowels[Math.floor(Math.random() * vowels.length)];

        // Slight conversational pitch contour across phrase (rises slightly mid-phrase, falls at end)
        const contour =
          s === syllableCount - 1
            ? 0.92 + Math.random() * 0.05
            : 0.97 + Math.random() * 0.11;
        const f0Start = basePitch * contour;
        const f0End = f0Start * (0.94 + Math.random() * 0.08);

        // Glottal voice source (sawtooth gives rich vocal harmonics without white-noise hiss)
        const glottal = ctx.createOscillator();
        glottal.type = 'sawtooth';
        glottal.frequency.setValueAtTime(f0Start, cursor);
        glottal.frequency.linearRampToValueAtTime(f0End, cursor + dur);

        // Dual parallel vowel formant filters (F1 + F2)
        const f1 = ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.frequency.setValueAtTime(f1Freq, cursor);
        f1.Q.value = 5.2;

        const f2 = ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.frequency.setValueAtTime(f2Freq, cursor);
        f2.Q.value = 6.0;

        const f2Gain = ctx.createGain();
        f2Gain.gain.value = 0.45;

        const sylGain = ctx.createGain();
        const peak = loudness * (0.75 + Math.random() * 0.45);
        sylGain.gain.setValueAtTime(0.0001, cursor);
        sylGain.gain.linearRampToValueAtTime(peak, cursor + dur * 0.28);
        sylGain.gain.exponentialRampToValueAtTime(0.0001, cursor + dur);

        glottal.connect(f1);
        glottal.connect(f2);
        f1.connect(sylGain);
        f2.connect(f2Gain);
        f2Gain.connect(sylGain);
        sylGain.connect(dest);

        glottal.start(cursor);
        glottal.stop(cursor + dur + 0.02);

        cursor += dur + gap;
      }
    };

    // 2. Five independent background patron voice streams (varied male & female voices across stereo field)
    const patrons = [
      { pitch: 118, pan: -0.68, vol: 0.11, interval: 430 },
      { pitch: 196, pan: -0.32, vol: 0.095, interval: 510 },
      { pitch: 142, pan: 0.08, vol: 0.085, interval: 470 },
      { pitch: 222, pan: 0.44, vol: 0.095, interval: 560 },
      { pitch: 108, pan: 0.72, vol: 0.105, interval: 610 },
    ];

    patrons.forEach((patron) => {
      // Immediate warm startup chatter so crowd is audible right away
      if (Math.random() < 0.75) {
        speakMuffledPhrase(
          patron.pitch * (0.94 + Math.random() * 0.12),
          patron.pan,
          patron.vol
        );
      }
      const timer = window.setInterval(() => {
        if (!bus.active || Math.random() > 0.68) return;
        speakMuffledPhrase(
          patron.pitch * (0.92 + Math.random() * 0.16),
          Math.max(-0.85, Math.min(0.85, patron.pan + (Math.random() - 0.5) * 0.25)),
          patron.vol
        );
      }, patron.interval);
      bus.timers.push(timer);
    });

    // 3. Authentic Cafe Foley: ceramic cup/saucer clinks, spoon stirs, soft wooden table thud
    const cafeFoleyTimer = window.setInterval(() => {
      if (!bus.active) return;
      const roll = Math.random();
      const now = ctx.currentTime;

      if (roll < 0.36) {
        // Crisp porcelain coffee cup / saucer clink (sometimes double-tap like stirring a spoon)
        const taps = Math.random() < 0.42 ? 2 : 1;
        for (let t = 0; t < taps; t++) {
          const hitTime = now + t * (0.11 + Math.random() * 0.08);
          const base = 2400 + Math.random() * 1450;
          const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          if (pan) {
            pan.pan.value = (Math.random() - 0.5) * 1.3;
            pan.connect(bus.gain);
          }
          const dest: AudioNode = pan ?? bus.gain;

          [1, 1.86, 2.74].forEach((ratio, idx) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(base * ratio, hitTime);
            const peak = (idx === 0 ? 0.055 : idx === 1 ? 0.032 : 0.016) * (t === 0 ? 1 : 0.72);
            g.gain.setValueAtTime(0.0001, hitTime);
            g.gain.linearRampToValueAtTime(peak, hitTime + 0.0025);
            g.gain.exponentialRampToValueAtTime(0.0001, hitTime + 0.13 + Math.random() * 0.08);
            osc.connect(g);
            g.connect(dest);
            osc.start(hitTime);
            osc.stop(hitTime + 0.24);
          });
        }
      } else if (roll < 0.52) {
        // Soft distant ceramic mug placed onto wooden cafe table (warm low-mid knock)
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(165 + Math.random() * 45, now);
        osc.frequency.exponentialRampToValueAtTime(78, now + 0.045);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.09, now + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
        osc.connect(g);
        g.connect(bus.gain);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    }, 1050);
    bus.timers.push(cafeFoleyTimer);
  }
}

export const ambientAudio = new AmbientAudioEngine();
