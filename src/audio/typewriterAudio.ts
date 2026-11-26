import type { SoundProfileId } from '../types';

/**
 * Procedural acoustic mechanical typewriter & switch synthesizer.
 * Models physical transients (lever click, hammer strike on rubber platen,
 * escapement advance tick, spacebar thump, backspace ratchet, brass margin bell,
 * and zip-ratchet carriage return) using pure Web Audio API with micro-variations
 * so rapid typing sounds genuinely mechanical and organic.
 */
class TypewriterAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private shortClickBuffer: AudioBuffer | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx) {
      this.noiseBuffer = this.createNoiseBuffer(this.ctx, 1.0);
    }
    if (!this.shortClickBuffer && this.ctx) {
      this.shortClickBuffer = this.createTransientNoiseBuffer(this.ctx, 0.08);
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createTransientNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Slight punchy coloring for impact transients
      const env = Math.exp(-i / (ctx.sampleRate * 0.014));
      data[i] = (white * 0.72 + (white - last) * 0.28) * env;
      last = white;
    }
    return buffer;
  }

  private toneMultiplier(tone: number): number {
    // tone is -50..+50 -> frequency multiplier ~0.72..1.38
    return Math.pow(2, tone / 110);
  }

  public playKeyStrike(
    profile: SoundProfileId,
    volumePercent: number,
    tone: number,
    keyHint?: string
  ) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer || !this.shortClickBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.9;
    const toneMul = this.toneMultiplier(tone);
    // Natural per-keystroke micro-variation (different typebars have slight mass/angle variance)
    const randPitch = 0.92 + Math.random() * 0.17;
    const randGain = 0.88 + Math.random() * 0.24;
    const keyHash = keyHint ? ((keyHint.charCodeAt(0) % 7) - 3) * 0.018 : 0;
    const pitchMul = toneMul * randPitch * (1 + keyHash);

    if (profile === 'classic' || profile === 'heavy') {
      const isHeavy = profile === 'heavy';
      const bodyBoost = isHeavy ? 1.32 : 1.0;
      const baseFreq = isHeavy ? 145 : 215;

      // Layer 1: Lever linkage initial metallic snap (tiny 5ms pre-transient)
      this.playFilteredNoise(ctx, {
        start: now,
        duration: 0.014,
        filterType: 'highpass',
        freq: 3400 * pitchMul,
        q: 1.4,
        gain: vol * 0.28 * randGain,
        decay: 0.006,
      });

      // Layer 2: Typebar hammer striking ink ribbon against rubber platen (delayed ~5ms)
      const impactTime = now + 0.0045;
      this.playFilteredNoise(ctx, {
        start: impactTime,
        duration: 0.042,
        filterType: 'bandpass',
        freq: (isHeavy ? 1450 : 1920) * pitchMul,
        q: 1.65,
        gain: vol * 0.82 * bodyBoost * randGain,
        decay: isHeavy ? 0.016 : 0.012,
      });

      // Layer 3: Platen roller rubber/wood body thud (gives physical desk weight)
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(baseFreq * pitchMul, impactTime);
      thudOsc.frequency.exponentialRampToValueAtTime(52, impactTime + (isHeavy ? 0.045 : 0.032));
      thudGain.gain.setValueAtTime(0.001, impactTime);
      thudGain.gain.linearRampToValueAtTime(vol * (isHeavy ? 0.52 : 0.36) * randGain, impactTime + 0.002);
      thudGain.gain.exponentialRampToValueAtTime(0.0008, impactTime + (isHeavy ? 0.048 : 0.035));
      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(impactTime);
      thudOsc.stop(impactTime + 0.055);

      // Layer 4: Crisp steel typebar ping (tiny metallic overtone)
      const pingOsc = ctx.createOscillator();
      const pingGain = ctx.createGain();
      pingOsc.type = 'sine';
      pingOsc.frequency.setValueAtTime((isHeavy ? 3100 : 4150) * pitchMul, impactTime);
      pingGain.gain.setValueAtTime(vol * 0.065 * randGain, impactTime);
      pingGain.gain.exponentialRampToValueAtTime(0.0005, impactTime + 0.018);
      pingOsc.connect(pingGain);
      pingGain.connect(ctx.destination);
      pingOsc.start(impactTime);
      pingOsc.stop(impactTime + 0.022);

      // Layer 5: Escapement carriage-advance metallic micro-tick (~16ms after strike)
      this.playFilteredNoise(ctx, {
        start: impactTime + 0.015 + Math.random() * 0.004,
        duration: 0.016,
        filterType: 'bandpass',
        freq: 5400 * pitchMul,
        q: 2.8,
        gain: vol * (isHeavy ? 0.26 : 0.21) * randGain,
        decay: 0.005,
      });
    } else if (profile === 'tactile') {
      // Tactile mechanical switch (crisp bump + creamy bottom-out thock)
      this.playFilteredNoise(ctx, {
        start: now,
        duration: 0.014,
        filterType: 'bandpass',
        freq: 4300 * pitchMul,
        q: 2.4,
        gain: vol * 0.44 * randGain,
        decay: 0.005,
      });

      const bottomTime = now + 0.007;
      this.playFilteredNoise(ctx, {
        start: bottomTime,
        duration: 0.032,
        filterType: 'bandpass',
        freq: 1180 * pitchMul,
        q: 1.3,
        gain: vol * 0.62 * randGain,
        decay: 0.011,
      });

      const thock = ctx.createOscillator();
      const thockGain = ctx.createGain();
      thock.type = 'sine';
      thock.frequency.setValueAtTime(240 * pitchMul, bottomTime);
      thock.frequency.exponentialRampToValueAtTime(75, bottomTime + 0.028);
      thockGain.gain.setValueAtTime(vol * 0.32 * randGain, bottomTime);
      thockGain.gain.exponentialRampToValueAtTime(0.001, bottomTime + 0.032);
      thock.connect(thockGain);
      thockGain.connect(ctx.destination);
      thock.start(bottomTime);
      thock.stop(bottomTime + 0.036);
    } else if (profile === 'soft') {
      // Dampened quiet studio thock
      this.playFilteredNoise(ctx, {
        start: now,
        duration: 0.028,
        filterType: 'lowpass',
        freq: 1050 * pitchMul,
        q: 0.9,
        gain: vol * 0.34 * randGain,
        decay: 0.012,
      });

      const softBody = ctx.createOscillator();
      const softGain = ctx.createGain();
      softBody.type = 'sine';
      softBody.frequency.setValueAtTime(165 * pitchMul, now);
      softBody.frequency.exponentialRampToValueAtTime(62, now + 0.026);
      softGain.gain.setValueAtTime(vol * 0.22 * randGain, now);
      softGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.03);
      softBody.connect(softGain);
      softGain.connect(ctx.destination);
      softBody.start(now);
      softBody.stop(now + 0.034);
    }
  }

  public playKeyRelease(profile: SoundProfileId, volumePercent: number, tone: number) {
    if (profile === 'silent' || volumePercent <= 0) return;
    if (profile === 'soft') return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const vol = (volumePercent / 100) * 0.14;
    const pitchMul = this.toneMultiplier(tone) * (0.94 + Math.random() * 0.12);

    this.playFilteredNoise(ctx, {
      start: ctx.currentTime,
      duration: 0.012,
      filterType: 'bandpass',
      freq: (profile === 'tactile' ? 3200 : 2600) * pitchMul,
      q: 2.0,
      gain: vol,
      decay: 0.004,
    });
  }

  public playSpacebar(profile: SoundProfileId, volumePercent: number, tone: number) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.9;
    const pitchMul = this.toneMultiplier(tone) * (0.95 + Math.random() * 0.1);
    const isSoft = profile === 'soft';

    // Deeper hollow bar thump + carriage step
    this.playFilteredNoise(ctx, {
      start: now,
      duration: 0.048,
      filterType: 'bandpass',
      freq: (isSoft ? 580 : 880) * pitchMul,
      q: 1.15,
      gain: vol * (isSoft ? 0.34 : 0.65),
      decay: 0.018,
    });

    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime((isSoft ? 120 : 145) * pitchMul, now);
    thump.frequency.exponentialRampToValueAtTime(42, now + 0.055);
    thumpGain.gain.setValueAtTime(vol * (isSoft ? 0.24 : 0.45), now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.065);

    if (!isSoft) {
      // Escapement advance clack
      this.playFilteredNoise(ctx, {
        start: now + 0.016,
        duration: 0.02,
        filterType: 'bandpass',
        freq: 3800 * pitchMul,
        q: 2.2,
        gain: vol * 0.25,
        decay: 0.007,
      });
    }
  }

  public playBackspace(profile: SoundProfileId, volumePercent: number, tone: number) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.72;
    const pitchMul = this.toneMultiplier(tone);

    // Reverse ratchet double-click
    this.playFilteredNoise(ctx, {
      start: now,
      duration: 0.02,
      filterType: 'bandpass',
      freq: 2900 * pitchMul,
      q: 2.4,
      gain: vol * 0.42,
      decay: 0.006,
    });
    this.playFilteredNoise(ctx, {
      start: now + 0.022,
      duration: 0.024,
      filterType: 'bandpass',
      freq: 1700 * pitchMul,
      q: 1.6,
      gain: vol * 0.46,
      decay: 0.009,
    });
  }

  public playMarginBell(
    volumePercent: number,
    tone = 0,
    variant: import('../types').BellVariantId = 'olivetti'
  ) {
    if (volumePercent <= 0 || variant === 'mechanical') return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.62;
    const pitchMul = Math.pow(2, tone / 360);

    // Sculpt bright crystalline metallic bell bus
    const bellBus = ctx.createGain();
    bellBus.gain.value = 1.0;

    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = variant === 'royal' ? 3600 : variant === 'underwood' ? 2100 : 2850;
    presence.Q.value = 1.1;
    presence.gain.value = 4.2;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 950;

    bellBus.connect(presence);
    presence.connect(highpass);
    highpass.connect(ctx.destination);

    // Distinct acoustic modal models for each real typewriter bell
    const playDomeStrike = (
      startTime: number,
      baseHz: number,
      gainScale: number,
      modes: { ratio: number; detuneHz?: number; amp: number; decay: number }[],
      clapperHz: number
    ) => {
      modes.forEach((m) => {
        const freq = baseHz * m.ratio + (m.detuneHz ?? 0);
        if (freq > 18800) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Real struck bell envelope: razor-sharp 1ms attack + fast initial brilliance + singing metallic tail
        const peak = Math.max(0.0005, vol * gainScale * m.amp * 0.42);
        g.gain.setValueAtTime(0.0001, startTime);
        g.gain.linearRampToValueAtTime(peak, startTime + 0.0012);
        g.gain.exponentialRampToValueAtTime(peak * 0.34, startTime + Math.min(0.16, m.decay * 0.22));
        g.gain.exponentialRampToValueAtTime(0.00015, startTime + m.decay);

        osc.connect(g);
        g.connect(bellBus);
        osc.start(startTime);
        osc.stop(startTime + m.decay + 0.06);
      });

      // Tiny crisp hardened-steel clapper tap right at attack ("T-" of "TING!")
      if (this.noiseBuffer) {
        this.playFilteredNoise(ctx, {
          start: startTime,
          duration: 0.009,
          filterType: 'bandpass',
          freq: clapperHz * pitchMul,
          q: 3.2,
          gain: vol * gainScale * 0.65,
          decay: 0.0028,
        });
      }
    };

    if (variant === 'olivetti') {
      // Crisp, bright iconic "TING!" — clean steel portable bell (~2780 Hz)
      playDomeStrike(
        now,
        2780 * pitchMul,
        1.0,
        [
          { ratio: 1.0, amp: 1.0, decay: 1.45 },
          { ratio: 1.0, detuneHz: 4.2, amp: 0.65, decay: 1.35 },
          { ratio: 2.004, amp: 0.48, decay: 0.85 },
          { ratio: 2.756, amp: 0.36, decay: 0.52 }, // true bell dome mode
          { ratio: 3.84, amp: 0.24, decay: 0.26 },
          { ratio: 5.12, amp: 0.16, decay: 0.11 },
        ],
        8400
      );
    } else if (variant === 'underwood') {
      // Rich, antique heavy brass dome bell (~1940 Hz) with long golden resonance
      playDomeStrike(
        now,
        1940 * pitchMul,
        1.08,
        [
          { ratio: 1.0, amp: 1.0, decay: 2.15 },
          { ratio: 1.0, detuneHz: 2.8, amp: 0.78, decay: 2.05 },
          { ratio: 1.996, amp: 0.52, decay: 1.35 },
          { ratio: 2.68, amp: 0.34, decay: 0.78 },
          { ratio: 3.92, amp: 0.2, decay: 0.42 },
          { ratio: 5.36, amp: 0.12, decay: 0.16 },
        ],
        6400
      );
    } else if (variant === 'royal') {
      // High, razor-bright crystalline silver-bell "TING!" (~3460 Hz)
      playDomeStrike(
        now,
        3460 * pitchMul,
        0.96,
        [
          { ratio: 1.0, amp: 1.0, decay: 1.25 },
          { ratio: 1.0, detuneHz: 5.5, amp: 0.62, decay: 1.18 },
          { ratio: 2.012, amp: 0.54, decay: 0.72 },
          { ratio: 2.89, amp: 0.38, decay: 0.38 },
          { ratio: 4.18, amp: 0.24, decay: 0.14 },
        ],
        9800
      );
    } else if (variant === 'chime') {
      // Classic vintage desk bell with crisp shimmering double-harmonic ring
      playDomeStrike(
        now,
        2420 * pitchMul,
        0.95,
        [
          { ratio: 1.0, amp: 1.0, decay: 1.75 },
          { ratio: 1.498, amp: 0.55, decay: 1.35 }, // fifth harmonic chime
          { ratio: 2.005, amp: 0.45, decay: 0.95 },
          { ratio: 3.01, amp: 0.26, decay: 0.48 },
        ],
        7800
      );
      // Subtle rapid metallic rebound ping 28ms later
      playDomeStrike(
        now + 0.028,
        2420 * pitchMul,
        0.34,
        [
          { ratio: 1.0, detuneHz: 3.0, amp: 0.9, decay: 1.5 },
          { ratio: 2.008, amp: 0.4, decay: 0.75 },
        ],
        8200
      );
    }
  }

  public playCarriageReturn(
    profile: SoundProfileId,
    volumePercent: number,
    tone: number,
    withBell: boolean,
    bellVariant: import('../types').BellVariantId = 'olivetti'
  ) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.78;
    const pitchMul = this.toneMultiplier(tone);

    // 1. Ring the chosen Enter bell variant crisply at t=0
    if (withBell && bellVariant !== 'mechanical') {
      this.playMarginBell(volumePercent, tone, bellVariant);
    }

    if (profile === 'soft' || profile === 'tactile') {
      // Clean mechanical line advance after bell attack
      this.playFilteredNoise(ctx, {
        start: now + (withBell && bellVariant !== 'mechanical' ? 0.05 : 0),
        duration: 0.032,
        filterType: 'bandpass',
        freq: 1350 * pitchMul,
        q: 1.5,
        gain: vol * 0.36,
        decay: 0.014,
      });
      return;
    }

    // 2. Platen roller line-feed ratchet (slight 55ms delay if bell rings so "TING!" cuts cleanly)
    const zipStart = now + (withBell && bellVariant !== 'mechanical' ? 0.058 : 0.005);
    this.playFilteredNoise(ctx, {
      start: zipStart,
      duration: 0.028,
      filterType: 'bandpass',
      freq: 1550 * pitchMul,
      q: 1.6,
      gain: vol * 0.45,
      decay: 0.012,
    });

    // 3. Rapid mechanical carriage zip-ratchet slide across the rail
    const tickCount = 9;
    for (let i = 0; i < tickCount; i++) {
      const progress = i / tickCount;
      const tickOffset = zipStart + 0.025 + progress * 0.185;
      const tickFreq = (2200 + progress * 1150) * pitchMul;
      const tickVol = vol * (0.11 + Math.sin(progress * Math.PI) * 0.18);
      this.playFilteredNoise(ctx, {
        start: tickOffset,
        duration: 0.015,
        filterType: 'bandpass',
        freq: tickFreq,
        q: 2.6,
        gain: tickVol,
        decay: 0.005,
      });
    }

    // 4. Crisp carriage stop bumper thud at left margin
    const stopTime = zipStart + 0.22;
    const stopOsc = ctx.createOscillator();
    const stopGain = ctx.createGain();
    stopOsc.type = 'triangle';
    stopOsc.frequency.setValueAtTime(132 * pitchMul, stopTime);
    stopOsc.frequency.exponentialRampToValueAtTime(46, stopTime + 0.068);
    stopGain.gain.setValueAtTime(vol * 0.42, stopTime);
    stopGain.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.075);
    stopOsc.connect(stopGain);
    stopGain.connect(ctx.destination);
    stopOsc.start(stopTime);
    stopOsc.stop(stopTime + 0.08);

    this.playFilteredNoise(ctx, {
      start: stopTime,
      duration: 0.04,
      filterType: 'lowpass',
      freq: 950 * pitchMul,
      q: 1.0,
      gain: vol * 0.36,
      decay: 0.018,
    });
  }

  /** Mechanical locked-typebar dull clunk when hitting right margin stop in Over-Realism mode */
  public playMarginLock(profile: SoundProfileId, volumePercent: number, tone: number) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.65;
    const pitchMul = this.toneMultiplier(tone);

    // Dull metallic dead-stop clunk
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(110 * pitchMul, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.032);
    g.gain.setValueAtTime(vol * 0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;

    osc.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.042);

    this.playFilteredNoise(ctx, {
      start: now,
      duration: 0.022,
      filterType: 'bandpass',
      freq: 920 * pitchMul,
      q: 2.2,
      gain: vol * 0.38,
      decay: 0.008,
    });
  }

  /** Crisp notched platen roller click when rolling paper up/down line-by-line */
  public playPlatenTurn(profile: SoundProfileId, volumePercent: number, tone: number) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.48;
    const pitchMul = this.toneMultiplier(tone);

    this.playFilteredNoise(ctx, {
      start: now,
      duration: 0.024,
      filterType: 'bandpass',
      freq: 1650 * pitchMul,
      q: 2.1,
      gain: vol * 0.45,
      decay: 0.008,
    });
  }

  /** Metallic tangled clatter when two steel typebars jam inside the typeguide V-notch */
  public playTypebarJam(profile: SoundProfileId, volumePercent: number, tone: number) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.85;
    const pitchMul = this.toneMultiplier(tone);

    // Double rapid steel collision clangs
    [0, 0.018].forEach((offset, idx) => {
      const t = now + offset;
      this.playFilteredNoise(ctx, {
        start: t,
        duration: 0.035,
        filterType: 'bandpass',
        freq: (idx === 0 ? 3100 : 2450) * pitchMul,
        q: 3.4,
        gain: vol * 0.65,
        decay: 0.012,
      });

      const clang = ctx.createOscillator();
      const g = ctx.createGain();
      clang.type = 'triangle';
      clang.frequency.setValueAtTime((idx === 0 ? 1850 : 1420) * pitchMul, t);
      clang.frequency.exponentialRampToValueAtTime(580, t + 0.045);
      g.gain.setValueAtTime(vol * 0.24, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.052);
      clang.connect(g);
      g.connect(ctx.destination);
      clang.start(t);
      clang.stop(t + 0.058);
    });
  }

  /** Satisfying spring snap-back when freeing jammed typebars */
  public playUnjamClick(profile: SoundProfileId, volumePercent: number, tone: number) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.7;
    const pitchMul = this.toneMultiplier(tone);

    this.playFilteredNoise(ctx, {
      start: now,
      duration: 0.02,
      filterType: 'bandpass',
      freq: 4100 * pitchMul,
      q: 2.8,
      gain: vol * 0.5,
      decay: 0.007,
    });
    this.playFilteredNoise(ctx, {
      start: now + 0.032,
      duration: 0.025,
      filterType: 'bandpass',
      freq: 1950 * pitchMul,
      q: 1.8,
      gain: vol * 0.45,
      decay: 0.01,
    });
  }

  /** Warm damp rubber-stamp-on-paper THUNK */
  public playRubberStamp(volumePercent: number) {
    if (volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.75;

    const thump = ctx.createOscillator();
    const g = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(140, now);
    thump.frequency.exponentialRampToValueAtTime(42, now + 0.08);
    g.gain.setValueAtTime(vol * 0.65, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    thump.connect(g);
    g.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.1);

    this.playFilteredNoise(ctx, {
      start: now,
      duration: 0.045,
      filterType: 'lowpass',
      freq: 780,
      q: 0.9,
      gain: vol * 0.52,
      decay: 0.02,
    });
  }

  /** Dry matte chalk-tape stamp click when applying white correction tape */
  public playCorrectionTape(profile: SoundProfileId, volumePercent: number, tone: number) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.72;
    const pitchMul = this.toneMultiplier(tone);

    // Quick plastic/ribbon reel click + dry chalk-paper press
    this.playFilteredNoise(ctx, {
      start: now,
      duration: 0.018,
      filterType: 'bandpass',
      freq: 3600 * pitchMul,
      q: 2.4,
      gain: vol * 0.44,
      decay: 0.006,
    });

    this.playFilteredNoise(ctx, {
      start: now + 0.014,
      duration: 0.032,
      filterType: 'bandpass',
      freq: 1480 * pitchMul,
      q: 1.5,
      gain: vol * 0.48,
      decay: 0.012,
    });
  }

  /** Satisfying twin-spool mechanical snap & ratchet when installing a fresh ink ribbon */
  public playRibbonSwap(volumePercent: number) {
    if (volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.8;

    // 1. Cover latch pop
    this.playFilteredNoise(ctx, {
      start: now,
      duration: 0.028,
      filterType: 'bandpass',
      freq: 1650,
      q: 1.8,
      gain: vol * 0.52,
      decay: 0.01,
    });

    // 2. Spool ratchet winding ticks
    [0.065, 0.115, 0.165, 0.215].forEach((offset, idx) => {
      this.playFilteredNoise(ctx, {
        start: now + offset,
        duration: 0.016,
        filterType: 'bandpass',
        freq: 2900 + idx * 320,
        q: 2.8,
        gain: vol * 0.36,
        decay: 0.006,
      });
    });

    // 3. Final crisp brass latch click shut
    this.playFilteredNoise(ctx, {
      start: now + 0.285,
      duration: 0.035,
      filterType: 'bandpass',
      freq: 2150,
      q: 2.0,
      gain: vol * 0.68,
      decay: 0.014,
    });
  }

  /** Paper sheet rolling swish + platen clicks when advancing to a new page */
  public playPaperFeed(profile: SoundProfileId, volumePercent: number, tone: number) {
    if (profile === 'silent' || volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const vol = (volumePercent / 100) * 0.68;
    const pitchMul = this.toneMultiplier(tone);

    // Crisp paper slide swish
    this.playFilteredNoise(ctx, {
      start: now,
      duration: 0.24,
      filterType: 'bandpass',
      freq: 2450 * pitchMul,
      q: 1.1,
      gain: vol * 0.34,
      decay: 0.12,
    });

    // Three mechanical platen notches
    [0.02, 0.085, 0.15].forEach((offset) => {
      this.playFilteredNoise(ctx, {
        start: now + offset,
        duration: 0.018,
        filterType: 'bandpass',
        freq: 1750 * pitchMul,
        q: 2.2,
        gain: vol * 0.32,
        decay: 0.007,
      });
    });
  }

  private playFilteredNoise(
    ctx: AudioContext,
    opts: {
      start: number;
      duration: number;
      filterType: BiquadFilterType;
      freq: number;
      q: number;
      gain: number;
      decay: number;
    }
  ) {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    // Pick a random slice inside the 1s noise buffer so no two strikes repeat identically
    const offset = Math.random() * Math.max(0.01, 0.92 - opts.duration);

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType;
    filter.frequency.setValueAtTime(Math.min(18000, Math.max(80, opts.freq)), opts.start);
    filter.Q.setValueAtTime(opts.q, opts.start);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0005, opts.start);
    env.gain.linearRampToValueAtTime(Math.max(0.001, opts.gain), opts.start + 0.0018);
    env.gain.exponentialRampToValueAtTime(0.0004, opts.start + opts.decay + opts.duration * 0.65);

    src.connect(filter);
    filter.connect(env);
    env.connect(ctx.destination);

    src.start(opts.start, offset, opts.duration + 0.02);
  }
}

export const typewriterAudio = new TypewriterAudioEngine();
