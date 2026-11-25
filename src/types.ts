export type TypeguideMode = 'follow' | 'static';

export type TypingModeId = 'standard' | 'over_realism';

export type SoundProfileId = 'classic' | 'heavy' | 'tactile' | 'soft' | 'silent';

export type BellVariantId = 'olivetti' | 'underwood' | 'royal' | 'chime' | 'mechanical';

export type PaperTextureId = 'ivory' | 'parchment' | 'linen' | 'newsprint' | 'charcoal';

export type PaperLayoutId = 'unlimited' | 'sheet';

export type AmbientTrackId = 'off' | 'rain' | 'lofi_piano' | 'fireplace' | 'rainy_cafe' | 'vinyl';

export type FontId =
  | 'special_elite'
  | 'courier_prime'
  | 'cutive_mono'
  | 'ibm_plex_mono'
  | 'lora';

export type LineSpacingId = 'compact' | 'normal' | 'relaxed';

export type InkWearId = 'fresh' | 'classic' | 'faded';

export type RibbonColorId = 'black' | 'red';

export type StampStyleId = 'none' | 'date_red' | 'date_ink' | 'archive_red';

/**
 * A single physical ink strike on paper in Over-Realism mode.
 * Coordinates (x, y) are continuous analog pixels relative to the paper's writing origin —
 * intentionally un-snapped so manual carriage & platen movement feels raw and authentic.
 */
export interface RealismStroke {
  id: string;
  char: string;
  x: number;
  y: number;
  jitterX: number;
  jitterY: number;
  inkAlpha: number;
  rotation: number;
  color: RibbonColorId;
}

export interface RealismCursor {
  /** Continuous analog horizontal position in px relative to paper writing origin */
  x: number;
  /** Continuous analog vertical position in px relative to paper writing origin */
  y: number;
}

export interface EditorSettings {
  // Core Mode & Margins (shared across Standard and Over-Realism)
  typingMode: TypingModeId;
  marginLeft: number; // column index (0 - 24)
  marginRight: number; // column index (28 - 74)
  ribbonColor: RibbonColorId;
  typebarAnimation: boolean;
  typebarJamEnabled: boolean;

  // Typeguide & Light
  typeguideMode: TypeguideMode;
  lightEnabled: boolean;
  lightIntensity: number; // 0 - 100
  lightSpread: number; // 20 - 100
  lightTemperature: number; // -100 (warm amber) to +100 (cool blue)
  showGuideRuler: boolean;

  // Paper & Atmosphere
  paperTexture: PaperTextureId;
  paperLayout: PaperLayoutId;
  darkness: number; // 0 - 100
  vintageIntensity: number; // 0 - 100
  inkWear: InkWearId;
  stampStyle: StampStyleId;

  // Mechanical Sound
  soundProfile: SoundProfileId;
  bellVariant: BellVariantId;
  soundVolume: number; // 0 - 100
  soundTone: number; // -50 (hangat) to +50 (tajam)
  marginBell: boolean;

  // Ambient Background Music
  ambientTrack: AmbientTrackId;
  ambientVolume: number; // 0 - 100

  // Typography
  fontId: FontId;
  fontSize: number; // 15 - 26
  lineSpacing: LineSpacingId;

  // Focus behavior
  autoFadeChrome: boolean;
}

export interface DocumentSheet {
  id: string;
  title: string;
  content: string;
  realismStrokes?: RealismStroke[];
  realismCursor?: RealismCursor;
  updatedAt: number;
}
