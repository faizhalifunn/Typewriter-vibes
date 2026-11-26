import type {
  AmbientChannelId,
  AmbientMixerState,
  AmbientTrackId,
  BellVariantId,
  EditorSettings,
  FontId,
  ImperfectionPresetId,
  LineSpacingId,
  PaperTextureId,
  SoundProfileId,
  StampStyleId,
} from '../types';

import paperIvoryUrl from '../assets/images/paper_ivory_cotton_1795595597644.jpg';
import paperParchmentUrl from '../assets/images/paper_vintage_parchment_1795595598147.jpg';
import paperLinenUrl from '../assets/images/paper_fine_linen_1795595600497.jpg';

export type PaperPatternId = 'none' | 'charcoal' | 'bond' | 'dots' | 'grid' | 'slate';

export interface PaperPreset {
  id: PaperTextureId;
  category: 'modern' | 'classic';
  name: string;
  description: string;
  imageUrl?: string;
  pattern?: PaperPatternId;
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
  bond_white: {
    id: 'bond_white',
    category: 'modern',
    name: 'Putih Studio (HVS)',
    description: 'Putih bersih, halus, dan tajam tanpa efek usang',
    pattern: 'bond',
    isDark: false,
    baseBg: '#fafaf9',
    deskBg: '#121316',
    inkColor: '#16181c',
    inkFadedColor: '#4a4f59',
    caretColor: '#14161a',
    selectionBg: 'rgba(59, 130, 246, 0.18)',
    textureOpacity: 1,
    swatchStyle: '#fafaf9',
  },
  dot_grid: {
    id: 'dot_grid',
    category: 'modern',
    name: 'Jurnal Titik (Dot Grid)',
    description: 'Kertas modern bertitik presisi ala buku catatan Jepang',
    pattern: 'dots',
    isDark: false,
    baseBg: '#f7f7f5',
    deskBg: '#121417',
    inkColor: '#181b20',
    inkFadedColor: '#4c525c',
    caretColor: '#181b20',
    selectionBg: 'rgba(59, 130, 246, 0.18)',
    textureOpacity: 1,
    swatchStyle: '#f7f7f5',
  },
  minimal_grid: {
    id: 'minimal_grid',
    category: 'modern',
    name: 'Kisi Studio (Grid Halus)',
    description: 'Garis kotak tipis kontemporer untuk catatan terstruktur',
    pattern: 'grid',
    isDark: false,
    baseBg: '#f4f6f8',
    deskBg: '#101419',
    inkColor: '#151b24',
    inkFadedColor: '#485466',
    caretColor: '#151b24',
    selectionBg: 'rgba(59, 130, 246, 0.18)',
    textureOpacity: 1,
    swatchStyle: '#f4f6f8',
  },
  nord_slate: {
    id: 'nord_slate',
    category: 'modern',
    name: 'Slate Gelap Modern',
    description: 'Permukaan gelap biru-abu bersih yang nyaman di mata',
    pattern: 'slate',
    isDark: true,
    baseBg: '#13171e',
    deskBg: '#0a0d12',
    inkColor: '#e7edf6',
    inkFadedColor: '#9aa8bd',
    caretColor: '#8dc4ff',
    selectionBg: 'rgba(120, 178, 255, 0.24)',
    textureOpacity: 1,
    swatchStyle: '#151a22',
  },
  ivory: {
    id: 'ivory',
    category: 'classic',
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
    category: 'classic',
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
    category: 'classic',
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
    category: 'classic',
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
    category: 'classic',
    name: 'Arang Malam',
    description: 'Kertas gelap matte untuk menulis malam',
    pattern: 'charcoal',
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

export interface AmbientChannelMeta {
  id: AmbientChannelId;
  name: string;
  description: string;
}

export const AMBIENT_CHANNELS: AmbientChannelMeta[] = [
  { id: 'rain', name: 'Hujan di Jendela', description: 'Rintik hujan lembut mengenai kaca' },
  { id: 'crowd', name: 'Tempat Ramai / Kafe', description: 'Gumaman obrolan ruang kafe & denting cangkir' },
  { id: 'lofi_piano', name: 'Piano Malam', description: 'Akor piano lembut yang mengalir pelan' },
  { id: 'fireplace', name: 'Perapian Hangat', description: 'Gemericik kayu terbakar yang menenangkan' },
  { id: 'vinyl', name: 'Vinyl Nostalgia', description: 'Desis piringan hitam analog yang hangat' },
];

export const EMPTY_AMBIENT_MIXER: AmbientMixerState = {
  rain: 0,
  lofi_piano: 0,
  fireplace: 0,
  vinyl: 0,
  crowd: 0,
};

export interface AmbientMixerPreset {
  id: string;
  name: string;
  mixer: AmbientMixerState;
}

export const AMBIENT_MIXER_PRESETS: AmbientMixerPreset[] = [
  {
    id: 'silent',
    name: 'Hening',
    mixer: { ...EMPTY_AMBIENT_MIXER },
  },
  {
    id: 'rainy_cafe',
    name: 'Kafe Hujan',
    mixer: { rain: 62, crowd: 54, lofi_piano: 35, fireplace: 0, vinyl: 15 },
  },
  {
    id: 'busy_coffee',
    name: 'Kedai Ramai',
    mixer: { rain: 0, crowd: 78, lofi_piano: 25, fireplace: 0, vinyl: 22 },
  },
  {
    id: 'cozy_hearth',
    name: 'Malam Perapian',
    mixer: { rain: 38, crowd: 0, lofi_piano: 58, fireplace: 68, vinyl: 25 },
  },
];

export function legacyTrackToMixer(track?: AmbientTrackId): AmbientMixerState {
  switch (track) {
    case 'rain':
      return { ...EMPTY_AMBIENT_MIXER, rain: 78 };
    case 'lofi_piano':
      return { ...EMPTY_AMBIENT_MIXER, lofi_piano: 75, vinyl: 22 };
    case 'fireplace':
      return { ...EMPTY_AMBIENT_MIXER, fireplace: 80 };
    case 'rainy_cafe':
      return { ...EMPTY_AMBIENT_MIXER, rain: 60, lofi_piano: 65, crowd: 35 };
    case 'vinyl':
      return { ...EMPTY_AMBIENT_MIXER, vinyl: 82 };
    default:
      return { ...EMPTY_AMBIENT_MIXER };
  }
}

export interface ImperfectionPresetMeta {
  id: ImperfectionPresetId;
  name: string;
  description: string;
  defaultIntensity: number;
}

export const IMPERFECTION_PRESETS: ImperfectionPresetMeta[] = [
  {
    id: 'precision',
    name: 'Presisi',
    description: 'Huruf rapi dan lurus seperti mesin terawat baru',
    defaultIntensity: 14,
  },
  {
    id: 'classic_tilt',
    name: 'Klasik Miring',
    description: 'Kemiringan halus, loncatan baseline & tekanan tinta natural',
    defaultIntensity: 52,
  },
  {
    id: 'vintage_worn',
    name: 'Antik Berantakan',
    description: 'Huruf lebih miring, naik-turun tegas & sesekali bayangan ganda',
    defaultIntensity: 84,
  },
];

export const PAGE_CONTENT_HEIGHT_PX = 940;
export const PAGE_GAP_PX = 34;

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

export const DEFAULT_TAB_STOPS = [10, 30, 55, 75];

export const STAMP_CUSTOM_PRESETS = ['ARSIP · AKSARA', 'DRAF I', 'RAHASIA', 'NASKAH ASLI'];

export const STAMP_STYLES: StampStylePreset[] = [
  { id: 'none', name: 'Tanpa Stempel', description: 'Kertas bersih tanpa cap' },
  { id: 'date_red', name: 'Cap Merah', description: 'Bingkai tunggal karet klasik tinta merah' },
  { id: 'date_ink', name: 'Cap Tinta', description: 'Bingkai tunggal minimalis tinta arang' },
  { id: 'archive_red', name: 'Arsip Merah', description: 'Cap arsip bingkai ganda tinta merah' },
  { id: 'archive_ink', name: 'Arsip Tinta', description: 'Cap arsip bingkai ganda tinta arang' },
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
      ambientMixer: { rain: 0, lofi_piano: 72, fireplace: 0, vinyl: 26, crowd: 0 },
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
      ambientMixer: { rain: 74, lofi_piano: 22, fireplace: 0, vinyl: 0, crowd: 0 },
    },
  },
  {
    id: 'newsroom',
    name: 'Redaksi 1962',
    subtitle: 'Koran antik · Mesin berat · Ramai',
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
      ambientMixer: { rain: 0, lofi_piano: 0, fireplace: 0, vinyl: 38, crowd: 56 },
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
      ambientMixer: { rain: 0, lofi_piano: 28, fireplace: 62, vinyl: 0, crowd: 0 },
    },
  },
  {
    id: 'studio_modern',
    name: 'Studio Modern',
    subtitle: 'Putih bersih · Tanpa vintage · Presisi',
    swatchBg: '#fafaf9',
    swatchGlow: '#d8e8ff',
    patch: {
      paperTexture: 'bond_white',
      darkness: 0,
      vintageIntensity: 0,
      inkWear: 'fresh',
      lightEnabled: true,
      lightIntensity: 45,
      lightSpread: 78,
      lightTemperature: 25,
      fontId: 'ibm_plex_mono',
      soundProfile: 'tactile',
      bellVariant: 'olivetti',
      ambientTrack: 'off',
      ambientMixer: { ...EMPTY_AMBIENT_MIXER },
    },
  },
  {
    id: 'slate_focus',
    name: 'Slate Fokus',
    subtitle: 'Slate gelap · Cahaya sejuk · Hujan',
    swatchBg: '#13171e',
    swatchGlow: '#8dc4ff',
    patch: {
      paperTexture: 'nord_slate',
      darkness: 42,
      vintageIntensity: 0,
      inkWear: 'fresh',
      lightEnabled: true,
      lightIntensity: 74,
      lightSpread: 64,
      lightTemperature: 58,
      fontId: 'ibm_plex_mono',
      soundProfile: 'tactile',
      bellVariant: 'olivetti',
      ambientTrack: 'rain',
      ambientMixer: { rain: 60, lofi_piano: 0, fireplace: 0, vinyl: 0, crowd: 24 },
    },
  },
];

export const DEFAULT_SETTINGS: EditorSettings = {
  typingMode: 'standard',
  marginLeft: 0,
  marginRight: 100,
  marginUnitVersion: 2,
  tabStops: [...DEFAULT_TAB_STOPS],
  showTabRuler: true,
  ribbonColor: 'black',
  typebarAnimation: true,
  typebarJamEnabled: true,
  ribbonDepletionEnabled: true,

  imperfectionPreset: 'classic_tilt',
  imperfectionIntensity: 52,
  imperfectionInStandard: false,

  typeguideMode: 'follow',
  lightEnabled: true,
  lightIntensity: 78,
  lightSpread: 58,
  lightTemperature: -45,
  showGuideRuler: true,

  paperTexture: 'ivory',
  paperLayout: 'unlimited',
  paginationEnabled: false,
  darkness: 46,
  vintageIntensity: 36,
  inkWear: 'classic',
  stampStyle: 'none',
  stampCustomText: '',
  stampShowDate: true,

  soundProfile: 'classic',
  bellVariant: 'olivetti',
  soundVolume: 78,
  soundTone: 0,
  marginBell: true,

  ambientTrack: 'off',
  ambientVolume: 56,
  ambientMixer: { ...EMPTY_AMBIENT_MIXER },

  fontId: 'special_elite',
  fontSize: 19,
  letterSpacing: 0,
  lineSpacing: 'normal',

  autoFadeChrome: true,
};

export const INITIAL_WELCOME_TEXT = `Malam yang tenang selalu punya cara sendiri untuk membuat pikiran mengalir.

Mulailah mengetik langsung dari papan ketik Anda. Setiap ketukan akan berpadu dengan suara tuas mesin ketik klasik, sementara cahaya dari typeguide menyorot tepat ke tempat kata-kata Anda lahir.

Buka panel Pengaturan di sudut kanan atas untuk mengganti mode typeguide (mengikuti ketikan atau kertas bergeser statis), memilih tekstur kertas, mengatur kegelapan dan nuansa vintage, serta menyalakan suasana musik latar.`;
