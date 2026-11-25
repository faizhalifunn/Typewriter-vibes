import type {
  AmbientTrackId,
  BellVariantId,
  EditorSettings,
  FontId,
  LineSpacingId,
  PaperTextureId,
  SoundProfileId,
  StampStyleId,
} from '../types';

import paperIvoryUrl from '../assets/images/paper_ivory_cotton_1795595597644.jpg';
import paperParchmentUrl from '../assets/images/paper_vintage_parchment_1795595598147.jpg';
import paperLinenUrl from '../assets/images/paper_fine_linen_1795595600497.jpg';

export interface PaperPreset {
  id: PaperTextureId;
  name: string;
  description: string;
  imageUrl?: string;
  isDark: boolean;
  baseBg: string;
  deskBg: string;
  inkColor: string;
  inkFadedColor: string;
  caretColor: string;
  selectionBg: string;
  textureOpacity: number;
  imageFilter?: string;
  swatchStyle: string;
}

export const PAPER_PRESETS: Record<PaperTextureId, PaperPreset> = {
  ivory: {
    id: 'ivory',
    name: 'Krem Klasik',
    description: 'Kertas katun gading hangat',
    imageUrl: paperIvoryUrl,
    isDark: false,
    baseBg: '#f3ebd8',
    deskBg: '#171411',
    inkColor: '#231e19',
    inkFadedColor: '#4a4138',
    caretColor: '#1e1914',
    selectionBg: 'rgba(180, 130, 62, 0.28)',
    textureOpacity: 0.92,
    swatchStyle: '#f1e7d2',
  },
  parchment: {
    id: 'parchment',
    name: 'Arsip Tua',
    description: 'Serat perkamen antik kecokelatan',
    imageUrl: paperParchmentUrl,
    isDark: false,
    baseBg: '#e4d5b7',
    deskBg: '#15110d',
    inkColor: '#2a2017',
    inkFadedColor: '#564536',
    caretColor: '#261b12',
    selectionBg: 'rgba(160, 108, 48, 0.30)',
    textureOpacity: 0.95,
    swatchStyle: '#dfd0b0',
  },
  linen: {
    id: 'linen',
    name: 'Linen Halus',
    description: 'Kertas surat putih tenun kapas',
    imageUrl: paperLinenUrl,
    isDark: false,
    baseBg: '#f4f3ee',
    deskBg: '#151515',
    inkColor: '#1c1d1f',
    inkFadedColor: '#484b50',
    caretColor: '#17181a',
    selectionBg: 'rgba(120, 130, 145, 0.25)',
    textureOpacity: 0.9,
    swatchStyle: '#f2f1ec',
  },
  newsprint: {
    id: 'newsprint',
    name: 'Koran Antik',
    description: 'Kertas cetak redup bertekstur kasar',
    imageUrl: paperParchmentUrl,
    isDark: false,
    baseBg: '#d8d2c5',
    deskBg: '#131312',
    inkColor: '#1f1e1c',
    inkFadedColor: '#494743',
    caretColor: '#1c1b19',
    selectionBg: 'rgba(130, 122, 104, 0.32)',
    textureOpacity: 0.88,
    imageFilter: 'saturate(0.32) contrast(1.04) brightness(0.96)',
    swatchStyle: '#d3cdc0',
  },
  charcoal: {
    id: 'charcoal',
    name: 'Arang Malam',
    description: 'Kertas gelap matte untuk menulis malam',
    isDark: true,
    baseBg: '#1a1816',
    deskBg: '#0c0b0a',
    inkColor: '#ebe3d3',
    inkFadedColor: '#b5ab98',
    caretColor: '#f3c677',
    selectionBg: 'rgba(230, 178, 96, 0.28)',
    textureOpacity: 1,
    swatchStyle: '#1e1c1a',
  },
};

export interface ComputedLightColor {
  rgb: string;
  coreHex: string;
  filamentHex: string;
  kelvin: number;
  label: string;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Maps temperature slider (-100 = deep warm candle/amber, 0 = neutral warm-white, +100 = crisp cool moonlight)
 * to realistic RGB/hex beam, filament, and core colors.
 */
export function temperatureToLightColors(temp: number): ComputedLightColor {
  const clamped = Math.max(-100, Math.min(100, temp));

  // Color stops: -100 (Candle Amber), -45 (Warm Tungsten), 0 (Neutral Ivory), +50 (Cool White), +100 (Cold Moonlight)
  const stops = [
    { pos: -100, r: 255, g: 146, b: 58, kelvin: 2000 },
    { pos: -45, r: 255, g: 198, b: 118, kelvin: 2900 },
    { pos: 0, r: 255, g: 244, b: 226, kelvin: 4500 },
    { pos: 50, r: 214, g: 232, b: 255, kelvin: 6800 },
    { pos: 100, r: 150, g: 198, b: 255, kelvin: 9500 },
  ];

  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].pos && clamped <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const span = upper.pos - lower.pos || 1;
  const t = (clamped - lower.pos) / span;
  const r = Math.round(lerp(lower.r, upper.r, t));
  const g = Math.round(lerp(lower.g, upper.g, t));
  const b = Math.round(lerp(lower.b, upper.b, t));
  const kelvin = Math.round(lerp(lower.kelvin, upper.kelvin, t) / 100) * 100;

  // Brighter filament core closer to white
  const coreHex = toHex(lerp(r, 255, 0.45), lerp(g, 255, 0.45), lerp(b, 255, 0.45));
  const filamentHex = toHex(r, g, b);

  let label = 'Netral';
  if (clamped <= -65) label = 'Sangat Hangat';
  else if (clamped <= -20) label = 'Hangat';
  else if (clamped >= 65) label = 'Sangat Dingin';
  else if (clamped >= 20) label = 'Dingin';

  return {
    rgb: `${r}, ${g}, ${b}`,
    coreHex,
    filamentHex,
    kelvin,
    label,
  };
}

export interface SoundProfilePreset {
  id: SoundProfileId;
  name: string;
  description: string;
}

export const SOUND_PROFILES: SoundProfilePreset[] = [
  {
    id: 'classic',
    name: 'Mesin Ketik Klasik',
    description: 'Hentakan pita, tuas logam, dan mekanisme gulungan realistis',
  },
  {
    id: 'heavy',
    name: 'Mesin Ketik Berat',
    description: 'Besi cor antik dengan pantulan lebih dalam dan tegas',
  },
  {
    id: 'tactile',
    name: 'Sakelar Mekanikal',
    description: 'Klik taktil presisi dengan resonansi bawah lembut',
  },
  {
    id: 'soft',
    name: 'Klik Lembut',
    description: 'Suara ketukan teredam, nyaman untuk malam hari',
  },
  {
    id: 'silent',
    name: 'Senyap',
    description: 'Tanpa efek suara ketikan',
  },
];

export interface BellVariantPreset {
  id: BellVariantId;
  name: string;
  description: string;
}

export const BELL_VARIANTS: BellVariantPreset[] = [
  {
    id: 'olivetti',
    name: 'Ting Jernih (Olivetti)',
    description: 'Denting baja terang dan bersih khas mesin ketik portabel Eropa',
  },
  {
    id: 'underwood',
    name: 'Bel Kuningan (Underwood)',
    description: 'Denting kuningan hangat, penuh, dan bergema panjang',
  },
  {
    id: 'royal',
    name: 'Ting Tajam (Royal)',
    description: 'Nada tinggi berkilau dengan serangan logam cepat',
  },
  {
    id: 'chime',
    name: 'Lonceng Klasik',
    description: 'Harmoni logam ganda yang renyah dan nostaljik',
  },
  {
    id: 'mechanical',
    name: 'Tuas Saja (Tanpa Bel)',
    description: 'Hanya suara gulungan dan tarikan carriage tanpa denting bel',
  },
];

export interface AmbientTrackPreset {
  id: AmbientTrackId;
  name: string;
  description: string;
}

export const AMBIENT_TRACKS: AmbientTrackPreset[] = [
  { id: 'off', name: 'Mati', description: 'Hening tanpa musik latar' },
  { id: 'rain', name: 'Hujan di Jendela', description: 'Rintik hujan lembut mengenai kaca' },
  { id: 'lofi_piano', name: 'Piano Malam', description: 'Akor piano lembut hangat yang mengalir pelan' },
  { id: 'fireplace', name: 'Perapian Hangat', description: 'Gemericik kayu terbakar yang menenangkan' },
  { id: 'rainy_cafe', name: 'Ruang Hujan & Piano', description: 'Perpaduan hujan halus dan melodi tenang' },
  { id: 'vinyl', name: 'Vinyl Nostalgia', description: 'Desis piringan hitam analog yang hangat' },
];

export interface FontPreset {
  id: FontId;
  name: string;
  sample: string;
  className: string;
  fontFamily: string;
  isMono: boolean;
}

export const FONT_PRESETS: Record<FontId, FontPreset> = {
  special_elite: {
    id: 'special_elite',
    name: 'Mesin Ketik Antik',
    sample: 'Pita tinta klasik 1958',
    className: 'font-typewriter-special',
    fontFamily: "'Special Elite', 'Courier New', monospace",
    isMono: true,
  },
  courier_prime: {
    id: 'courier_prime',
    name: 'Naskah Klasik',
    sample: 'Bersih dan presisi seperti naskah',
    className: 'font-typewriter-courier',
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    isMono: true,
  },
  cutive_mono: {
    id: 'cutive_mono',
    name: 'Olivetti Halus',
    sample: 'Tipis, puitis, bergaya Eropa',
    className: 'font-typewriter-cutive',
    fontFamily: "'Cutive Mono', 'Courier New', monospace",
    isMono: true,
  },
  ibm_plex_mono: {
    id: 'ibm_plex_mono',
    name: 'Presisi Modern',
    sample: 'Garis tegas bergaya mesin listrik',
    className: 'font-typewriter-plex',
    fontFamily: "'IBM Plex Mono', monospace",
    isMono: true,
  },
  lora: {
    id: 'lora',
    name: 'Prosa Sastra',
    sample: 'Huruf buku sastra yang hangat',
    className: 'font-typewriter-lora',
    fontFamily: "'Lora', Georgia, serif",
    isMono: false,
  },
};

export const LINE_SPACING_VALUES: Record<LineSpacingId, number> = {
  compact: 1.55,
  normal: 1.85,
  relaxed: 2.2,
};

export interface StampStylePreset {
  id: StampStyleId;
  name: string;
  description: string;
}

export const STAMP_STYLES: StampStylePreset[] = [
  { id: 'none', name: 'Tanpa Stempel', description: 'Kertas bersih tanpa cap tanggal' },
  { id: 'date_red', name: 'Tanggal Merah', description: 'Cap tanggal karet klasik tinta merah' },
  { id: 'date_ink', name: 'Tanggal Tinta', description: 'Cap tanggal minimalis tinta arang' },
  { id: 'archive_red', name: 'Cap Arsip', description: 'Stempel arsip antik bertanggal di sudut kertas' },
];

export interface MoodPreset {
  id: string;
  name: string;
  subtitle: string;
  swatchBg: string;
  swatchGlow: string;
  patch: Partial<EditorSettings>;
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'midnight',
    name: 'Tengah Malam',
    subtitle: 'Arang gelap · Lilin hangat · Piano',
    swatchBg: '#1b1815',
    swatchGlow: '#ff9e4a',
    patch: {
      paperTexture: 'charcoal',
      darkness: 74,
      vintageIntensity: 32,
      lightEnabled: true,
      lightIntensity: 86,
      lightSpread: 54,
      lightTemperature: -72,
      fontId: 'special_elite',
      soundProfile: 'classic',
      bellVariant: 'underwood',
      ambientTrack: 'lofi_piano',
    },
  },
  {
    id: 'rainy_dusk',
    name: 'Hujan Sore',
    subtitle: 'Arsip tua · Tungsten · Hujan kaca',
    swatchBg: '#dfd0b0',
    swatchGlow: '#ffc470',
    patch: {
      paperTexture: 'parchment',
      darkness: 54,
      vintageIntensity: 56,
      lightEnabled: true,
      lightIntensity: 80,
      lightSpread: 60,
      lightTemperature: -48,
      fontId: 'cutive_mono',
      soundProfile: 'classic',
      bellVariant: 'olivetti',
      ambientTrack: 'rain',
    },
  },
  {
    id: 'newsroom',
    name: 'Redaksi 1962',
    subtitle: 'Koran antik · Mesin berat · Netral',
    swatchBg: '#d3cdc0',
    swatchGlow: '#fff0d6',
    patch: {
      paperTexture: 'newsprint',
      darkness: 32,
      vintageIntensity: 66,
      lightEnabled: true,
      lightIntensity: 68,
      lightSpread: 68,
      lightTemperature: -10,
      fontId: 'courier_prime',
      soundProfile: 'heavy',
      bellVariant: 'royal',
      ambientTrack: 'vinyl',
    },
  },
  {
    id: 'morning_study',
    name: 'Pagi Tenang',
    subtitle: 'Linen putih · Terang sejuk · Prosa',
    swatchBg: '#f2f1ec',
    swatchGlow: '#d2e5ff',
    patch: {
      paperTexture: 'linen',
      darkness: 14,
      vintageIntensity: 14,
      lightEnabled: true,
      lightIntensity: 58,
      lightSpread: 74,
      lightTemperature: 32,
      fontId: 'lora',
      soundProfile: 'soft',
      bellVariant: 'chime',
      ambientTrack: 'fireplace',
    },
  },
];

export const DEFAULT_SETTINGS: EditorSettings = {
  typingMode: 'standard',
  marginLeft: 0,
  marginRight: 60,
  ribbonColor: 'black',
  typebarAnimation: true,
  typebarJamEnabled: true,

  typeguideMode: 'follow',
  lightEnabled: true,
  lightIntensity: 78,
  lightSpread: 58,
  lightTemperature: -45,
  showGuideRuler: true,

  paperTexture: 'ivory',
  paperLayout: 'unlimited',
  darkness: 46,
  vintageIntensity: 36,
  inkWear: 'classic',
  stampStyle: 'none',

  soundProfile: 'classic',
  bellVariant: 'olivetti',
  soundVolume: 78,
  soundTone: 0,
  marginBell: true,

  ambientTrack: 'off',
  ambientVolume: 42,

  fontId: 'special_elite',
  fontSize: 19,
  lineSpacing: 'normal',

  autoFadeChrome: true,
};

export const INITIAL_WELCOME_TEXT = `Malam yang tenang selalu punya cara sendiri untuk membuat pikiran mengalir.

Mulailah mengetik langsung dari papan ketik Anda. Setiap ketukan akan berpadu dengan suara tuas mesin ketik klasik, sementara cahaya dari typeguide menyorot tepat ke tempat kata-kata Anda lahir.

Buka panel Pengaturan di sudut kanan atas untuk mengganti mode typeguide (mengikuti ketikan atau kertas bergeser statis), memilih tekstur kertas, mengatur kegelapan dan nuansa vintage, serta menyalakan suasana musik latar.`;
