export type TypeguideMode = 'follow' | 'static';

export type TypingModeId = 'standard' | 'over_realism';

export type SoundProfileId = 'classic' | 'heavy' | 'tactile' | 'soft' | 'silent';

export type BellVariantId = 'olivetti' | 'underwood' | 'royal' | 'chime' | 'mechanical';

export type PaperTextureId =
  | 'bond_white'
  | 'dot_grid'
  | 'minimal_grid'
  | 'nord_slate'
  | 'ivory'
  | 'parchment'
  | 'linen'
  | 'newsprint'
  | 'charcoal';

export type PaperLayoutId = 'unlimited' | 'sheet';

export type AmbientTrackId = 'off' | 'rain' | 'lofi_piano' | 'fireplace' | 'rainy_cafe' | 'vinyl';

export type AmbientChannelId = 'rain' | 'lofi_piano' | 'fireplace' | 'vinyl' | 'crowd';

export type AmbientMixerState = Record<AmbientChannelId, number>;

export type FontId =
  | 'special_elite'
  | 'courier_prime'
  | 'cutive_mono'
  | 'ibm_plex_mono'
  | 'lora';

export type LineSpacingId = 'compact' | 'normal' | 'relaxed';

export type InkWearId = 'fresh' | 'classic' | 'faded';

export type RibbonColorId = 'black' | 'blue' | 'red' | 'correction';

export type StampStyleId = 'none' | 'date_red' | 'date_ink' | 'archive_red' | 'archive_ink';

export type ImperfectionPresetId = 'precision' | 'classic_tilt' | 'vintage_worn';

export type QuoteAspectRatio = '1:1' | '4:5' | '9:16';

/**
 * A single physical strike or white correction-tape patch on paper in Over-Realism mode.
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
  ghostOffset?: number;
  scaleY?: number;
}

export interface RealismCursor {
  /** Continuous analog horizontal position in px relative to paper writing origin */
  x: number;
  /** Continuous analog vertical position in px relative to paper writing origin */
  y: number;
}

export interface EditorSettings {
  // Core Mode & Margins (physical % of printable paper width, shared across Standard & Over-Realism)
  typingMode: TypingModeId;
  marginLeft: number; // 0 - 40 (% from left printable edge)
  marginRight: number; // 50 - 100 (% from left printable edge)
  marginUnitVersion?: number; // 2 = paper-fixed percentage margins
  tabStops: number[]; // sorted custom tab stops (% of printable width, 4 - 96)
  showTabRuler: boolean; // show interactive top-of-paper tab ruler
  ribbonColor: RibbonColorId;
  typebarAnimation: boolean;
  typebarJamEnabled: boolean;
  ribbonDepletionEnabled: boolean;

  // Imperfect Mechanical Strike Character (Slanted / uneven typewriter letters)
  imperfectionPreset: ImperfectionPresetId;
  imperfectionIntensity: number; // 0 - 100
  imperfectionInStandard: boolean;

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
  paginationEnabled: boolean;
  darkness: number; // 0 - 100
  vintageIntensity: number; // 0 - 100
  inkWear: InkWearId;
  stampStyle: StampStyleId;
  stampCustomText: string;
  stampShowDate: boolean;

  // Mechanical Sound
  soundProfile: SoundProfileId;
  bellVariant: BellVariantId;
  soundVolume: number; // 0 - 100
  soundTone: number; // -50 (hangat) to +50 (tajam)
  marginBell: boolean;

  // Layered Ambient Soundscape Mixer
  ambientTrack: AmbientTrackId; // kept for backwards-compat migration
  ambientVolume: number; // Master ambient volume 0 - 100
  ambientMixer: AmbientMixerState;

  // Typography
  fontId: FontId;
  fontSize: number; // 15 - 26
  letterSpacing: number; // -1.0 to +4.0 px
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
  ribbonInk?: number; // 0 - 100 remaining ink in Over-Realism
  lastEditedMode?: TypingModeId;
  syncedStandardSnapshot?: string;
  updatedAt: number;
}
