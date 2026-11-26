import type { ImperfectionPresetId } from '../types';

export interface CharacterStrikeMetrics {
  jitterX: number;
  jitterY: number;
  rotation: number;
  inkAlpha: number;
  ghostOffset: number;
  scaleY: number;
}

/**
 * Deterministic fast hash in [-1, 1] so characters in Standard Mode stay rock-solid
 * without shimmering when subsequent letters are typed.
 */
function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/**
 * Gives specific keys a consistent subtle machine-specific typebar lean
 * (just like real vintage typewriters where e.g. 'e' or 't' leans slightly more than 'm').
 */
function machineKeyBias(char: string): { rotBias: number; yBias: number } {
  const code = char.charCodeAt(0);
  const rotBias = seededUnit(code * 31 + 7) * 0.55;
  const yBias = seededUnit(code * 19 + 13) * 0.45;
  return { rotBias, yBias };
}

function presetMultiplier(preset: ImperfectionPresetId): {
  rotMax: number;
  jitterXMax: number;
  jitterYMax: number;
  alphaFloor: number;
  ghostChance: number;
} {
  if (preset === 'precision') {
    return {
      rotMax: 0.75,
      jitterXMax: 0.25,
      jitterYMax: 0.45,
      alphaFloor: 0.92,
      ghostChance: 0,
    };
  }
  if (preset === 'vintage_worn') {
    return {
      rotMax: 4.8,
      jitterXMax: 1.15,
      jitterYMax: 2.55,
      alphaFloor: 0.62,
      ghostChance: 0.26,
    };
  }
  // classic_tilt (balanced expressive slanted mechanical character)
  return {
    rotMax: 2.85,
    jitterXMax: 0.72,
    jitterYMax: 1.55,
    alphaFloor: 0.76,
    ghostChance: 0.1,
  };
}

/**
 * Computes deterministic mechanical tilt, baseline bounce, uneven ink density,
 * and optional ghost double-strike for Standard Mode & Quote Cards.
 */
export function getDeterministicStrikeMetrics(
  index: number,
  char: string,
  intensityPercent: number,
  preset: ImperfectionPresetId
): CharacterStrikeMetrics {
  const amount = Math.max(0, Math.min(1, intensityPercent / 100));
  if (amount <= 0.01 || char === ' ' || char === '\n' || char === '\t') {
    return { jitterX: 0, jitterY: 0, rotation: 0, inkAlpha: 1, ghostOffset: 0, scaleY: 1 };
  }

  const cfg = presetMultiplier(preset);
  const bias = machineKeyBias(char);
  const code = char.charCodeAt(0);
  const s1 = seededUnit(index * 17 + code * 3 + 11);
  const s2 = seededUnit(index * 29 + code * 5 + 23);
  const s3 = seededUnit(index * 43 + code * 7 + 37);
  const s4 = seededUnit(index * 61 + code * 11 + 53);

  const rotation = (bias.rotBias * 0.55 + s1 * 0.75) * cfg.rotMax * amount;
  const jitterX = s2 * cfg.jitterXMax * amount;
  const jitterY = (bias.yBias * 0.45 + s3 * 0.8) * cfg.jitterYMax * amount;
  const inkSpread = 1 - cfg.alphaFloor;
  const inkAlpha = 1 - ((s4 + 1) * 0.5) * inkSpread * amount;

  const ghostRoll = (seededUnit(index * 71 + code * 13 + 91) + 1) * 0.5;
  const ghostOffset =
    ghostRoll < cfg.ghostChance * amount
      ? Number(((s1 >= 0 ? 1 : -1) * (0.45 + 0.5 * amount)).toFixed(2))
      : 0;
  const scaleY = 1 + s3 * 0.03 * amount;

  return { jitterX, jitterY, rotation, inkAlpha, ghostOffset, scaleY };
}

/**
 * Generates rich organic physical strike metrics for a newly struck letter in Over-Realism mode,
 * incorporating preset, intensity slider, machine key bias, and remaining ink ribbon level.
 */
export function generatePhysicalStrikeMetrics(
  char: string,
  intensityPercent: number,
  preset: ImperfectionPresetId,
  ribbonInkPercent: number,
  ribbonDepletionEnabled: boolean
): CharacterStrikeMetrics {
  const amount = Math.max(0, Math.min(1, intensityPercent / 100));
  const cfg = presetMultiplier(preset);
  const bias = machineKeyBias(char);

  const r1 = Math.random() * 2 - 1;
  const r2 = Math.random() * 2 - 1;
  const r3 = Math.random() * 2 - 1;

  const rotation = (bias.rotBias * 0.5 + r1 * 0.85) * cfg.rotMax * amount;
  const jitterX = r2 * cfg.jitterXMax * amount;
  const jitterY = (bias.yBias * 0.45 + r3 * 0.85) * cfg.jitterYMax * amount;

  // Base mechanical pressure variance
  const pressureVariance = 1 - Math.random() * (1 - cfg.alphaFloor) * Math.max(0.25, amount);

  // Ink ribbon depletion curve (smoothly fades as ink drops, down to ~22% dry-ribbon ghost)
  let ribbonFactor = 1;
  if (ribbonDepletionEnabled) {
    const pct = Math.max(0, Math.min(100, ribbonInkPercent)) / 100;
    // Stays fairly rich above 45%, then visibly dries out below 35%
    const dryFlicker = pct < 0.3 ? (Math.random() - 0.5) * 0.14 : 0;
    ribbonFactor = Math.max(0.22, Math.min(1, 0.24 + Math.pow(pct, 0.68) * 0.76 + dryFlicker));
  }

  const inkAlpha = Math.max(0.18, Math.min(1, pressureVariance * ribbonFactor));
  const ghostOffset =
    Math.random() < cfg.ghostChance * amount
      ? Number(((Math.random() >= 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.55 * amount)).toFixed(2))
      : 0;
  const scaleY = 1 + (Math.random() - 0.5) * 0.04 * amount;

  return { jitterX, jitterY, rotation, inkAlpha, ghostOffset, scaleY };
}
