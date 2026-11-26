import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  FileText,
  Maximize2,
  Minimize2,
  Quote,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ambientAudio } from './audio/ambientAudio';
import { typewriterAudio } from './audio/typewriterAudio';
import { OverRealismCanvas } from './components/OverRealismCanvas';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { QuoteCardModal } from './components/QuoteCardModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { SheetsPopover } from './components/SheetsPopover';
import { TabRuler } from './components/TabRuler';
import { TypeguideOverlay } from './components/TypeguideOverlay';
import {
  DEFAULT_SETTINGS,
  DEFAULT_TAB_STOPS,
  EMPTY_AMBIENT_MIXER,
  FONT_PRESETS,
  INITIAL_WELCOME_TEXT,
  LINE_SPACING_VALUES,
  PAGE_CONTENT_HEIGHT_PX,
  PAPER_PRESETS,
  legacyTrackToMixer,
  temperatureToLightColors,
} from './constants/presets';
import {
  generatePhysicalStrikeMetrics,
  getDeterministicStrikeMetrics,
} from './utils/imperfection';
import {
  exportStyledPaperPng,
  realismStrokesToPlainText,
  textToRealismStrokes,
} from './utils/paperExporter';
import type {
  DocumentSheet,
  EditorSettings,
  RealismCursor,
  RealismStroke,
  TypingModeId,
} from './types';

const STORAGE_SETTINGS_KEY = 'aksara_settings_v1';
const STORAGE_SHEETS_KEY = 'aksara_sheets_v1';
const STORAGE_ACTIVE_SHEET_KEY = 'aksara_active_sheet_v1';

function loadSavedSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const isV3Margin = parsed.marginUnitVersion === 3;
    const migratedLeft =
      isV3Margin && typeof parsed.marginLeft === 'number'
        ? Math.max(0, Math.min(45, Math.round(parsed.marginLeft)))
        : DEFAULT_SETTINGS.marginLeft;
    const migratedRight =
      isV3Margin && typeof parsed.marginRight === 'number'
        ? Math.max(55, Math.min(100, Math.round(parsed.marginRight)))
        : DEFAULT_SETTINGS.marginRight;
    const safeLeft = Math.min(migratedLeft, migratedRight - 12);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      lightTemperature:
        typeof parsed.lightTemperature === 'number'
          ? parsed.lightTemperature
          : DEFAULT_SETTINGS.lightTemperature,
      paperLayout:
        parsed.paperLayout === 'sheet' || parsed.paperLayout === 'unlimited'
          ? parsed.paperLayout
          : DEFAULT_SETTINGS.paperLayout,
      bellVariant: parsed.bellVariant ?? DEFAULT_SETTINGS.bellVariant,
      typingMode:
        parsed.typingMode === 'over_realism' || parsed.typingMode === 'standard'
          ? parsed.typingMode
          : DEFAULT_SETTINGS.typingMode,
      marginLeft: Math.max(0, safeLeft),
      marginRight: Math.max(55, migratedRight),
      marginUnitVersion: 3,
      tabStops: Array.isArray(parsed.tabStops)
        ? Array.from(
            new Set<number>(
              parsed.tabStops
                .filter((n: unknown): n is number => typeof n === 'number' && !Number.isNaN(n))
                .map((n: number) => Math.max(2, Math.min(98, Math.round(n))))
            )
          ).sort((a, b) => a - b)
        : [...DEFAULT_TAB_STOPS],
      showTabRuler:
        typeof parsed.showTabRuler === 'boolean'
          ? parsed.showTabRuler
          : DEFAULT_SETTINGS.showTabRuler,
      letterSpacing:
        typeof parsed.letterSpacing === 'number'
          ? Math.max(-1, Math.min(4, Number(parsed.letterSpacing.toFixed(1))))
          : DEFAULT_SETTINGS.letterSpacing,
      ribbonColor:
        parsed.ribbonColor === 'red' ||
        parsed.ribbonColor === 'blue' ||
        parsed.ribbonColor === 'black' ||
        parsed.ribbonColor === 'correction'
          ? parsed.ribbonColor
          : DEFAULT_SETTINGS.ribbonColor,
      ribbonDepletionEnabled:
        typeof parsed.ribbonDepletionEnabled === 'boolean'
          ? parsed.ribbonDepletionEnabled
          : DEFAULT_SETTINGS.ribbonDepletionEnabled,
      imperfectionPreset:
        parsed.imperfectionPreset === 'precision' ||
        parsed.imperfectionPreset === 'classic_tilt' ||
        parsed.imperfectionPreset === 'vintage_worn'
          ? parsed.imperfectionPreset
          : DEFAULT_SETTINGS.imperfectionPreset,
      imperfectionIntensity:
        typeof parsed.imperfectionIntensity === 'number'
          ? parsed.imperfectionIntensity
          : DEFAULT_SETTINGS.imperfectionIntensity,
      imperfectionInStandard:
        typeof parsed.imperfectionInStandard === 'boolean'
          ? parsed.imperfectionInStandard
          : DEFAULT_SETTINGS.imperfectionInStandard,
      paginationEnabled:
        typeof parsed.paginationEnabled === 'boolean'
          ? parsed.paginationEnabled
          : DEFAULT_SETTINGS.paginationEnabled,
      ambientMixer:
        parsed.ambientMixer && typeof parsed.ambientMixer === 'object'
          ? { ...EMPTY_AMBIENT_MIXER, ...parsed.ambientMixer }
          : legacyTrackToMixer(parsed.ambientTrack),
      typebarAnimation:
        typeof parsed.typebarAnimation === 'boolean'
          ? parsed.typebarAnimation
          : DEFAULT_SETTINGS.typebarAnimation,
      typebarJamEnabled:
        typeof parsed.typebarJamEnabled === 'boolean'
          ? parsed.typebarJamEnabled
          : DEFAULT_SETTINGS.typebarJamEnabled,
      stampStyle: parsed.stampStyle ?? DEFAULT_SETTINGS.stampStyle,
      stampCustomText:
        typeof parsed.stampCustomText === 'string'
          ? parsed.stampCustomText.slice(0, 28)
          : DEFAULT_SETTINGS.stampCustomText,
      stampShowDate:
        typeof parsed.stampShowDate === 'boolean'
          ? parsed.stampShowDate
          : DEFAULT_SETTINGS.stampShowDate,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const QWERTY_ROWS = ['1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'];

function getKeyStrikeAngle(key: string): number {
  const lower = key.toLowerCase();
  for (const row of QWERTY_ROWS) {
    const idx = row.indexOf(lower);
    if (idx !== -1) {
      const normalized = idx / Math.max(1, row.length - 1) - 0.5; // -0.5 .. +0.5
      return Math.round(normalized * 64); // -32deg .. +32deg
    }
  }
  return Math.round((Math.random() - 0.5) * 28);
}

function loadSavedSheets(): DocumentSheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_SHEETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => ({
          id: String(s.id ?? `sheet-${Date.now()}`),
          title: typeof s.title === 'string' ? s.title : 'Tanpa Judul',
          content: typeof s.content === 'string' ? s.content : '',
          realismStrokes: Array.isArray(s.realismStrokes) ? s.realismStrokes : undefined,
          realismCursor:
            s.realismCursor &&
            typeof s.realismCursor.x === 'number' &&
            typeof s.realismCursor.y === 'number'
              ? s.realismCursor
              : undefined,
          ribbonInk: typeof s.ribbonInk === 'number' ? s.ribbonInk : 100,
          lastEditedMode:
            s.lastEditedMode === 'over_realism' || s.lastEditedMode === 'standard'
              ? s.lastEditedMode
              : undefined,
          syncedStandardSnapshot:
            typeof s.syncedStandardSnapshot === 'string' ? s.syncedStandardSnapshot : undefined,
          updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
        }));
      }
    }
  } catch {
    // fallback
  }
  return [
    {
      id: 'sheet-initial',
      title: 'Catatan Malam',
      content: INITIAL_WELCOME_TEXT,
      ribbonInk: 100,
      updatedAt: Date.now(),
    },
  ];
}

export default function App() {
  const [settings, setSettings] = useState<EditorSettings>(loadSavedSettings);
  const [sheets, setSheets] = useState<DocumentSheet[]>(loadSavedSheets);
  const [activeSheetId, setActiveSheetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_SHEET_KEY);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return 'sheet-initial';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSheetsOpen, setIsSheetsOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteModalInitialText, setQuoteModalInitialText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);

  // Active typing & visual state
  const [caretIndex, setCaretIndex] = useState(0);
  const [hasSelection, setHasSelection] = useState(false);
  const [caretLocal, setCaretLocal] = useState({ x: 64, y: 78 });
  const [mirrorHeight, setMirrorHeight] = useState(820);
  const [charWidth, setCharWidth] = useState(11.4);
  const [manualScrollY, setManualScrollY] = useState(0);
  const [isTypingActive, setIsTypingActive] = useState(false);
  const [isCarriageReturning, setIsCarriageReturning] = useState(false);
  const [isFreeSliding, setIsFreeSliding] = useState(false);
  const [strikePulse, setStrikePulse] = useState(false);
  const [strikeAngle, setStrikeAngle] = useState(0);
  const [isTypebarJammed, setIsTypebarJammed] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  // Over-Realism physical carriage flags
  const [marginReleased, setMarginReleased] = useState(false);
  const [marginLockedAlert, setMarginLockedAlert] = useState(false);

  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const realismInputRef = useRef<HTMLInputElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const caretMarkerRef = useRef<HTMLSpanElement | null>(null);
  const charMeasureRef = useRef<HTMLSpanElement | null>(null);

  const typingTimerRef = useRef<number | null>(null);
  const strikeTimerRef = useRef<number | null>(null);
  const carriageTimerRef = useRef<number | null>(null);
  const lockAlertTimerRef = useRef<number | null>(null);
  const marginBellRungLineRef = useRef<number>(-1);
  const lastPageIndexRef = useRef<number>(0);
  const previousSoundProfileRef = useRef(settings.soundProfile);
  const lastStrikeTimeRef = useRef<number>(0);
  const lastStrikeKeyRef = useRef<string>('');

  // Continuous analog arrow-key glide refs for Over-Realism mode
  const heldArrowsRef = useRef<Set<string>>(new Set());
  const arrowRafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const slideSoundAccumRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  const marginReleasedRef = useRef(marginReleased);
  const leftMarginPxRef = useRef(0);
  const rightMarginPxRef = useRef(644);
  const maxPhysicalPxRef = useRef(700);

  settingsRef.current = settings;
  marginReleasedRef.current = marginReleased;

  const isOverRealism = settings.typingMode === 'over_realism';

  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.id === activeSheetId) ?? sheets[0];
  }, [sheets, activeSheetId]);

  const content = activeSheet?.content ?? '';
  const activeRibbonInk = activeSheet?.ribbonInk ?? 100;
  const realismStrokes: RealismStroke[] = activeSheet?.realismStrokes ?? [];

  // Derived visual geometry
  const paperPreset = PAPER_PRESETS[settings.paperTexture] ?? PAPER_PRESETS.ivory;
  const fontPreset = FONT_PRESETS[settings.fontId];
  const lightPreset = temperatureToLightColors(settings.lightTemperature);
  const lineHeightRatio = LINE_SPACING_VALUES[settings.lineSpacing];
  const lineHeightPx = Math.round(settings.fontSize * lineHeightRatio);
  const effectiveLetterSpacingCss =
    Math.abs(settings.letterSpacing ?? 0) < 0.05
      ? fontPreset.isMono
        ? '0.01em'
        : '0.005em'
      : `${settings.letterSpacing.toFixed(1)}px`;
  const isUnlimitedPaper = settings.paperLayout === 'unlimited';
  const paperPatternClass =
    paperPreset.pattern === 'charcoal'
      ? 'paper-charcoal-texture'
      : paperPreset.pattern === 'bond'
        ? 'paper-modern-bond'
        : paperPreset.pattern === 'dots'
          ? 'paper-modern-dots'
          : paperPreset.pattern === 'grid'
            ? 'paper-modern-grid'
            : paperPreset.pattern === 'slate'
              ? 'paper-modern-slate'
              : '';
  const hasRepeatingGridPattern =
    paperPreset.pattern === 'dots' || paperPreset.pattern === 'grid';

  const isCompactViewport = viewport.width < 820;
  const paperWidth = isCompactViewport
    ? Math.max(300, viewport.width - (isUnlimitedPaper ? 16 : 24))
    : isUnlimitedPaper
      ? Math.max(820, Math.min(viewport.width - 32, 1360))
      : Math.max(760, Math.min(viewport.width - 48, 1040));
  const padX = isCompactViewport ? 16 : isUnlimitedPaper ? 32 : 38;
  const padTop = isCompactViewport ? 68 : 96;
  const padBottom = Math.max(360, Math.round(viewport.height * 0.52));

  // Generous physical paper margins (% of wide printable canvas) — steady across any font size!
  const printableWidth = Math.max(240, paperWidth - padX * 2);
  const leftMarginPx = (settings.marginLeft / 100) * printableWidth;
  const rightMarginPx = (settings.marginRight / 100) * printableWidth;
  const maxPhysicalPx = printableWidth + Math.round(padX * 0.65);
  const standardPadLeft = Math.round(padX + leftMarginPx);
  const standardPadRight = Math.max(padX, Math.round(padX + (printableWidth - rightMarginPx)));

  leftMarginPxRef.current = leftMarginPx;
  rightMarginPxRef.current = rightMarginPx;
  maxPhysicalPxRef.current = maxPhysicalPx;

  const realismCursor: RealismCursor = activeSheet?.realismCursor ?? {
    x: leftMarginPx,
    y: 0,
  };

  // Persist settings & sheets in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SHEETS_KEY, JSON.stringify(sheets));
      if (activeSheet) {
        localStorage.setItem(STORAGE_ACTIVE_SHEET_KEY, activeSheet.id);
      }
    } catch {
      // ignore
    }
  }, [sheets, activeSheet]);

  // Imprint existing Standard text into free-flow Over-Realism strokes on initial entry if needed
  useEffect(() => {
    if (!isOverRealism || !activeSheet) return;
    if (activeSheet.realismStrokes === undefined) {
      const converted = textToRealismStrokes(
        activeSheet.content,
        leftMarginPx,
        rightMarginPx,
        charWidth,
        lineHeightPx,
        settings.imperfectionIntensity,
        settings.imperfectionPreset,
        settings.ribbonColor
      );
      setSheets((prev) =>
        prev.map((s) =>
          s.id === activeSheet.id
            ? {
                ...s,
                realismStrokes: converted.strokes,
                realismCursor: converted.cursor,
                syncedStandardSnapshot: activeSheet.content,
              }
            : s
        )
      );
    }
  }, [
    isOverRealism,
    activeSheet,
    leftMarginPx,
    rightMarginPx,
    settings.imperfectionIntensity,
    settings.imperfectionPreset,
    settings.ribbonColor,
    charWidth,
    lineHeightPx,
  ]);

  // Sync layered ambient mixer audio engine
  useEffect(() => {
    ambientAudio.setMix(settings.ambientMixer, settings.ambientVolume);
  }, [settings.ambientMixer, settings.ambientVolume]);

  useEffect(() => {
    return () => {
      ambientAudio.stopAll();
      if (arrowRafRef.current) cancelAnimationFrame(arrowRafRef.current);
    };
  }, []);

  // Track window viewport & fullscreen state
  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const focusActiveEditor = useCallback(() => {
    if (isOverRealism) {
      realismInputRef.current?.focus({ preventScroll: true });
    } else {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [isOverRealism]);

  // Focus appropriate input on sheet or mode change
  useEffect(() => {
    heldArrowsRef.current.clear();
    setIsFreeSliding(false);
    setIsTypebarJammed(false);
    if (arrowRafRef.current) {
      cancelAnimationFrame(arrowRafRef.current);
      arrowRafRef.current = null;
    }

    if (isOverRealism) {
      realismInputRef.current?.focus({ preventScroll: true });
    } else {
      const ta = textareaRef.current;
      if (!ta) return;
      const endPos = ta.value.length;
      ta.setSelectionRange(endPos, endPos);
      setCaretIndex(endPos);
      ta.focus({ preventScroll: true });
    }
  }, [activeSheet?.id, isOverRealism]);

  // Reveal top bar when moving pointer
  useEffect(() => {
    const onPointerMove = () => {
      setChromeVisible(true);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  // Measure monospace pitch & exact caret coordinates
  const measureGeometry = useCallback(() => {
    if (charMeasureRef.current) {
      const measured = charMeasureRef.current.getBoundingClientRect().width / 10;
      if (measured > 4) {
        setCharWidth((prev) => (Math.abs(prev - measured) > 0.05 ? measured : prev));
      }
    }
    if (!isOverRealism) {
      const marker = caretMarkerRef.current;
      const mirror = mirrorRef.current;
      if (marker) {
        const nextX = marker.offsetLeft;
        const nextY = marker.offsetTop;
        setCaretLocal((prev) =>
          prev.x === nextX && prev.y === nextY ? prev : { x: nextX, y: nextY }
        );
      }
      if (mirror) {
        const nextH = Math.max(Math.round(viewport.height * 1.15), mirror.scrollHeight + 40);
        setMirrorHeight((prev) => (Math.abs(prev - nextH) > 2 ? nextH : prev));
      }
    }
  }, [viewport.height, isOverRealism]);

  useLayoutEffect(() => {
    measureGeometry();
  }, [
    content,
    caretIndex,
    settings.fontId,
    settings.fontSize,
    settings.letterSpacing,
    settings.lineSpacing,
    settings.marginLeft,
    settings.marginRight,
    paperWidth,
    isOverRealism,
    measureGeometry,
  ]);

  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        measureGeometry();
      });
    }
  }, [measureGeometry, settings.fontId]);

  const updateActiveSheet = useCallback(
    (updater: (sheet: DocumentSheet) => DocumentSheet) => {
      setSheets((prev) => {
        const targetId = prev.some((s) => s.id === activeSheetId)
          ? activeSheetId
          : prev[0]?.id;
        return prev.map((s) => (s.id === targetId ? updater(s) : s));
      });
    },
    [activeSheetId]
  );

  // Seamless two-way synchronization between Standard Mode and Over-Realism Mode
  const switchTypingMode = useCallback(
    (nextMode: TypingModeId) => {
      if (nextMode === settings.typingMode) return;

      if (nextMode === 'standard' && activeSheet && activeSheet.realismStrokes !== undefined) {
        const syncedText = realismStrokesToPlainText(
          activeSheet.realismStrokes,
          charWidth,
          lineHeightPx
        );
        updateActiveSheet((s) => ({
          ...s,
          content: syncedText,
          syncedStandardSnapshot: syncedText,
          lastEditedMode: 'over_realism',
        }));
      } else if (nextMode === 'over_realism' && activeSheet) {
        const needsReImprint =
          activeSheet.realismStrokes === undefined ||
          (activeSheet.lastEditedMode === 'standard' &&
            activeSheet.content !== activeSheet.syncedStandardSnapshot);

        if (needsReImprint) {
          const converted = textToRealismStrokes(
            activeSheet.content,
            leftMarginPx,
            rightMarginPx,
            charWidth,
            lineHeightPx,
            settings.imperfectionIntensity,
            settings.imperfectionPreset,
            settings.ribbonColor
          );
          updateActiveSheet((s) => ({
            ...s,
            realismStrokes: converted.strokes,
            realismCursor: converted.cursor,
            syncedStandardSnapshot: activeSheet.content,
          }));
        }
      }

      setSettings((prev) => ({
        ...prev,
        typingMode: nextMode,
        ribbonColor:
          nextMode === 'standard' && prev.ribbonColor === 'correction'
            ? 'black'
            : prev.ribbonColor,
      }));
    },
    [
      settings.typingMode,
      leftMarginPx,
      rightMarginPx,
      settings.imperfectionIntensity,
      settings.imperfectionPreset,
      settings.ribbonColor,
      activeSheet,
      charWidth,
      lineHeightPx,
      updateActiveSheet,
    ]
  );

  const updateSetting = useCallback(
    <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
      if (key === 'typingMode') {
        switchTypingMode(value as TypingModeId);
        return;
      }
      setSettings((prev) => {
        if (key === 'soundProfile' && value !== 'silent') {
          previousSoundProfileRef.current = value as EditorSettings['soundProfile'];
        }
        return { ...prev, [key]: value };
      });
    },
    [switchTypingMode]
  );

  const applySettingsPatch = useCallback(
    (patch: Partial<EditorSettings>) => {
      if (patch.typingMode && patch.typingMode !== settings.typingMode) {
        switchTypingMode(patch.typingMode);
      }
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [settings.typingMode, switchTypingMode]
  );

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const handleSwapRibbon = useCallback(() => {
    updateActiveSheet((s) => ({
      ...s,
      ribbonInk: 100,
      updatedAt: Date.now(),
    }));
    typewriterAudio.playRibbonSwap(Math.max(settings.soundVolume, 60));
    focusActiveEditor();
  }, [updateActiveSheet, settings.soundVolume, focusActiveEditor]);

  const handleToggleTabStop = useCallback(
    (percent: number) => {
      const clamped = Math.max(2, Math.min(98, Math.round(percent)));
      setSettings((prev) => {
        const exists = prev.tabStops.includes(clamped);
        const nextStops = exists
          ? prev.tabStops.filter((v) => v !== clamped)
          : [...prev.tabStops, clamped].sort((a, b) => a - b).slice(0, 12);
        return { ...prev, tabStops: nextStops };
      });
      typewriterAudio.playPlatenTurn(
        settings.soundProfile,
        settings.soundVolume * 0.6,
        settings.soundTone
      );
      focusActiveEditor();
    },
    [settings.soundProfile, settings.soundVolume, settings.soundTone, focusActiveEditor]
  );

  const syncCaretFromTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    setCaretIndex(ta.selectionStart);
    setHasSelection(ta.selectionStart !== ta.selectionEnd);
  }, []);

  const triggerStrikeFeedback = useCallback(
    (isReturn = false, keyForAngle?: string) => {
      setManualScrollY(0);
      setIsTypingActive(true);
      if (settings.autoFadeChrome && !isSettingsOpen && !isSheetsOpen) {
        setChromeVisible(false);
      }

      if (keyForAngle) {
        setStrikeAngle(getKeyStrikeAngle(keyForAngle));
      }

      setStrikePulse(true);
      if (strikeTimerRef.current) window.clearTimeout(strikeTimerRef.current);
      strikeTimerRef.current = window.setTimeout(() => setStrikePulse(false), 62);

      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => setIsTypingActive(false), 650);

      if (isReturn) {
        setIsCarriageReturning(true);
        if (carriageTimerRef.current) window.clearTimeout(carriageTimerRef.current);
        carriageTimerRef.current = window.setTimeout(() => setIsCarriageReturning(false), 290);
      }
    },
    [settings.autoFadeChrome, isSettingsOpen, isSheetsOpen]
  );

  const handleUnjamTypebars = useCallback(() => {
    setIsTypebarJammed(false);
    typewriterAudio.playUnjamClick(settings.soundProfile, settings.soundVolume, settings.soundTone);
    focusActiveEditor();
  }, [settings.soundProfile, settings.soundVolume, settings.soundTone, focusActiveEditor]);

  const flashMarginLock = useCallback(() => {
    setMarginLockedAlert(true);
    if (lockAlertTimerRef.current) window.clearTimeout(lockAlertTimerRef.current);
    lockAlertTimerRef.current = window.setTimeout(() => setMarginLockedAlert(false), 1400);
  }, []);

  // --- CONTINUOUS ANALOG CARRIAGE / PLATEN GLIDE LOOP (OVER-REALISM ARROWS) ---
  // Zero letter snapping! Smooth manual micro-drift with subtle analog friction & mechanical ticks
  const stepAnalogArrowGlide = useCallback(
    (now: number) => {
      const held = heldArrowsRef.current;
      if (held.size === 0) {
        arrowRafRef.current = null;
        setIsFreeSliding(false);
        return;
      }

      const dt = Math.min(0.05, Math.max(0.004, (now - lastFrameTimeRef.current) / 1000));
      lastFrameTimeRef.current = now;

      const s = settingsRef.current;
      const maxX = marginReleasedRef.current ? maxPhysicalPxRef.current : rightMarginPxRef.current;

      // Raw analog slide speeds (feels manual, slightly organic, never snaps to grid!)
      const horizSpeed = 138; // px per second
      const vertSpeed = 108; // px per second
      const dx =
        (held.has('ArrowRight') ? horizSpeed * dt : 0) -
        (held.has('ArrowLeft') ? horizSpeed * dt : 0);
      const dy =
        (held.has('ArrowDown') ? vertSpeed * dt : 0) -
        (held.has('ArrowUp') ? vertSpeed * dt : 0);

      if (dx !== 0 || dy !== 0) {
        const dist = Math.hypot(dx, dy);
        slideSoundAccumRef.current += dist;
        if (slideSoundAccumRef.current >= 16) {
          slideSoundAccumRef.current = 0;
          if (Math.abs(dy) >= Math.abs(dx)) {
            typewriterAudio.playPlatenTurn(s.soundProfile, s.soundVolume * 0.55, s.soundTone);
          } else {
            typewriterAudio.playBackspace(s.soundProfile, s.soundVolume * 0.42, s.soundTone);
          }
        }

        updateActiveSheet((sheet) => {
          const cur = sheet.realismCursor ?? { x: leftMarginPxRef.current, y: 0 };
          let nextX = cur.x + dx;
          let nextY = cur.y + dy;

          if (nextX < 0) nextX = 0;
          if (nextX > maxX) {
            nextX = maxX;
          }
          if (nextY < 0) nextY = 0;

          return {
            ...sheet,
            realismCursor: { x: nextX, y: nextY },
          };
        });
      }

      arrowRafRef.current = requestAnimationFrame(stepAnalogArrowGlide);
    },
    [updateActiveSheet]
  );

  // Clear held arrows if window loses focus
  useEffect(() => {
    const clearHeld = () => {
      heldArrowsRef.current.clear();
      setIsFreeSliding(false);
      if (arrowRafRef.current) {
        cancelAnimationFrame(arrowRafRef.current);
        arrowRafRef.current = null;
      }
    };
    window.addEventListener('blur', clearHeld);
    return () => window.removeEventListener('blur', clearHeld);
  }, []);

  // --- STANDARD MODE KEYBOARD HANDLERS ---
  const handleStandardKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleExportPaperPng();
      }
      return;
    }

    const { soundProfile, soundVolume, soundTone, marginBell, bellVariant } = settings;

    if (e.key === 'Enter') {
      typewriterAudio.playCarriageReturn(
        soundProfile,
        soundVolume,
        soundTone,
        marginBell,
        bellVariant
      );
      marginBellRungLineRef.current = -1;
      triggerStrikeFeedback(true);
      return;
    }

    if (e.key === ' ') {
      typewriterAudio.playSpacebar(soundProfile, soundVolume, soundTone);
      triggerStrikeFeedback(false);
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      typewriterAudio.playBackspace(soundProfile, soundVolume, soundTone);
      triggerStrikeFeedback(false);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      // Jump to the next configured Tab Stop pin on the paper ruler!
      const currentRelPx = Math.max(leftMarginPx, caretLocal.x - padX);
      const currentPct = (currentRelPx / Math.max(1, printableWidth)) * 100;
      const nextStop = settings.tabStops.find(
        (stop) => stop > currentPct + 1.0 && stop <= settings.marginRight
      );

      let spacesCount = 4;
      if (nextStop !== undefined) {
        const targetPx = (nextStop / 100) * printableWidth;
        const deltaPx = Math.max(charWidth, targetPx - currentRelPx);
        spacesCount = Math.max(1, Math.min(36, Math.round(deltaPx / Math.max(5, charWidth))));
      }

      const insertion = ' '.repeat(spacesCount);
      const next = content.slice(0, start) + insertion + content.slice(end);
      updateActiveSheet((s) => ({
        ...s,
        content: next,
        lastEditedMode: 'standard',
        updatedAt: Date.now(),
      }));
      requestAnimationFrame(() => {
        ta.setSelectionRange(start + spacesCount, start + spacesCount);
        setCaretIndex(start + spacesCount);
      });
      typewriterAudio.playSpacebar(soundProfile, soundVolume, soundTone);
      triggerStrikeFeedback(false);
      return;
    }

    if (e.key.length === 1) {
      typewriterAudio.playKeyStrike(soundProfile, soundVolume, soundTone, e.key);
      triggerStrikeFeedback(false, e.key);

      // Ring margin warning bell near the physical Right Margin (adapts automatically to fontSize & letterSpacing!)
      if (marginBell && soundProfile !== 'silent') {
        const ta = e.currentTarget;
        const before = ta.value.slice(0, ta.selectionStart);
        const lines = before.split('\n');
        const currentLineIdx = lines.length - 1;
        const usableCols = Math.max(
          10,
          Math.floor((rightMarginPx - leftMarginPx) / Math.max(5, charWidth))
        );
        const warnAt = Math.max(6, usableCols - 6);
        const currentLineLen = lines[currentLineIdx].length + 1;
        if (currentLineLen >= warnAt && marginBellRungLineRef.current !== currentLineIdx) {
          marginBellRungLineRef.current = currentLineIdx;
          typewriterAudio.playMarginBell(soundVolume * 0.9, soundTone, bellVariant);
        }
      }
    }
  };

  const handleStandardKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    syncCaretFromTextarea();
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      typewriterAudio.playKeyRelease(settings.soundProfile, settings.soundVolume, settings.soundTone);
    }
  };

  const handleStandardChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateActiveSheet((s) => ({
      ...s,
      content: e.target.value,
      lastEditedMode: 'standard',
      updatedAt: Date.now(),
    }));
    setCaretIndex(e.target.selectionStart);
    setHasSelection(e.target.selectionStart !== e.target.selectionEnd);
  };

  // --- OVER-REALISM PHYSICAL FREE-FLOW TYPEWRITER HANDLERS ---
  const handleRealismKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const {
      soundProfile,
      soundVolume,
      soundTone,
      marginBell,
      bellVariant,
      ribbonColor,
    } = settings;

    // Quick Correction Tape shortcut: Ctrl+Backspace or Shift+Backspace
    // Steps back 1 character pitch and stamps a chalk-white correction patch in-place!
    if ((e.ctrlKey || e.metaKey || e.shiftKey) && e.key === 'Backspace') {
      e.preventDefault();
      setMarginLockedAlert(false);
      const targetX = Math.max(0, realismCursor.x - charWidth);
      const targetY = realismCursor.y;
      const tapeStroke: RealismStroke = {
        id: `tape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        char: ' ',
        x: targetX,
        y: targetY,
        jitterX: (Math.random() - 0.5) * 0.5,
        jitterY: (Math.random() - 0.5) * 0.6,
        inkAlpha: 0.98,
        rotation: (Math.random() - 0.5) * 1.4,
        color: 'correction',
      };
      typewriterAudio.playCorrectionTape(soundProfile, soundVolume, soundTone);
      updateActiveSheet((s) => ({
        ...s,
        realismStrokes: [...(s.realismStrokes ?? []), tapeStroke],
        realismCursor: { x: targetX, y: targetY },
        lastEditedMode: 'over_realism',
        updatedAt: Date.now(),
      }));
      triggerStrikeFeedback(false);
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleExportPaperPng();
      }
      return;
    }

    const minLeftPx = leftMarginPx;
    const maxRightPx = rightMarginPx;

    // Pressing Escape frees jammed typebars!
    if (e.key === 'Escape' && isTypebarJammed) {
      e.preventDefault();
      handleUnjamTypebars();
      return;
    }

    // Free-flow manual carriage & platen roller via Arrow keys (NO snapping to letters or rows!)
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      e.preventDefault();
      setManualScrollY(0);
      setMarginLockedAlert(false);

      if (!heldArrowsRef.current.has(e.key)) {
        // Immediate tiny analog micro-nudge (~3.4px, NOT a full character!) so single taps feel raw & manual
        const microX =
          e.key === 'ArrowRight' ? 3.4 : e.key === 'ArrowLeft' ? -3.4 : 0;
        const microY =
          e.key === 'ArrowDown' ? 3.8 : e.key === 'ArrowUp' ? -3.8 : 0;

        if (microX > 0 && !marginReleased && realismCursor.x >= maxRightPx) {
          typewriterAudio.playMarginLock(soundProfile, soundVolume, soundTone);
          flashMarginLock();
          return;
        }

        if (microY !== 0) {
          typewriterAudio.playPlatenTurn(soundProfile, soundVolume * 0.6, soundTone);
        } else {
          typewriterAudio.playBackspace(soundProfile, soundVolume * 0.45, soundTone);
        }

        const capX = marginReleased ? maxPhysicalPx : maxRightPx;
        updateActiveSheet((s) => {
          const cur = s.realismCursor ?? { x: minLeftPx, y: 0 };
          return {
            ...s,
            realismCursor: {
              x: Math.max(0, Math.min(capX, cur.x + microX)),
              y: Math.max(0, cur.y + microY),
            },
          };
        });

        heldArrowsRef.current.add(e.key);
        setIsFreeSliding(true);
        if (!arrowRafRef.current) {
          lastFrameTimeRef.current = performance.now();
          slideSoundAccumRef.current = 0;
          arrowRafRef.current = requestAnimationFrame(stepAnalogArrowGlide);
        }
      }
      return;
    }

    // Carriage Return (Enter): rings chosen bell, zips carriage back to left margin, advances platen 1 line
    if (e.key === 'Enter') {
      e.preventDefault();
      typewriterAudio.playCarriageReturn(
        soundProfile,
        soundVolume,
        soundTone,
        marginBell,
        bellVariant
      );
      setMarginReleased(false);
      setMarginLockedAlert(false);
      marginBellRungLineRef.current = -1;
      updateActiveSheet((s) => {
        const cur = s.realismCursor ?? { x: minLeftPx, y: 0 };
        return {
          ...s,
          realismCursor: {
            x: minLeftPx + (Math.random() - 0.5) * 0.6,
            y: cur.y + lineHeightPx,
          },
          lastEditedMode: 'over_realism',
          updatedAt: Date.now(),
        };
      });
      triggerStrikeFeedback(true);
      return;
    }

    // Backspace: NEVER ERASES INK! Physically steps carriage backward (~1 pitch with tiny analog variance)
    if (e.key === 'Backspace') {
      e.preventDefault();
      typewriterAudio.playBackspace(soundProfile, soundVolume, soundTone);
      setMarginLockedAlert(false);
      const backStep = charWidth * (0.96 + Math.random() * 0.08);
      updateActiveSheet((s) => {
        const cur = s.realismCursor ?? { x: minLeftPx, y: 0 };
        return {
          ...s,
          realismCursor: { x: Math.max(0, cur.x - backStep), y: cur.y },
        };
      });
      triggerStrikeFeedback(false);
      return;
    }

    // Delete cannot erase dried ink — mechanical lock clunk
    if (e.key === 'Delete') {
      e.preventDefault();
      typewriterAudio.playMarginLock(soundProfile, soundVolume, soundTone);
      return;
    }

    // Tab: mechanical tabulator jump to next custom Tab Stop pin (or ~5 pitches if none ahead)
    if (e.key === 'Tab') {
      e.preventDefault();
      const capX = marginReleased ? maxPhysicalPx : maxRightPx;
      const capPct = marginReleased ? 100 : settings.marginRight;
      const currentPct = (realismCursor.x / Math.max(1, printableWidth)) * 100;
      const nextStop = settings.tabStops.find(
        (stop) => stop > currentPct + 1.0 && stop <= capPct
      );
      const targetX =
        nextStop !== undefined
          ? Math.min(capX, (nextStop / 100) * printableWidth)
          : Math.min(capX, realismCursor.x + charWidth * 5);

      typewriterAudio.playSpacebar(soundProfile, soundVolume, soundTone);
      updateActiveSheet((s) => {
        const cur = s.realismCursor ?? { x: minLeftPx, y: 0 };
        return {
          ...s,
          realismCursor: { x: targetX, y: cur.y },
        };
      });
      triggerStrikeFeedback(false);
      return;
    }

    // Spacebar: advances carriage 1 pitch (or stamps white correction tape if correction ribbon is active!)
    if (e.key === ' ') {
      e.preventDefault();
      if (!marginReleased && realismCursor.x >= maxRightPx - 1) {
        typewriterAudio.playMarginLock(soundProfile, soundVolume, soundTone);
        flashMarginLock();
        return;
      }

      if (ribbonColor === 'correction') {
        typewriterAudio.playCorrectionTape(soundProfile, soundVolume, soundTone);
        const strikeX = realismCursor.x;
        const strikeY = realismCursor.y;
        const tapeStroke: RealismStroke = {
          id: `tape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          char: ' ',
          x: strikeX,
          y: strikeY,
          jitterX: (Math.random() - 0.5) * 0.5,
          jitterY: (Math.random() - 0.5) * 0.6,
          inkAlpha: 0.98,
          rotation: (Math.random() - 0.5) * 1.4,
          color: 'correction',
        };
        const nextX = Math.min(maxPhysicalPx, strikeX + charWidth * 0.96);
        updateActiveSheet((s) => ({
          ...s,
          realismStrokes: [...(s.realismStrokes ?? []), tapeStroke],
          realismCursor: { x: nextX, y: strikeY },
          lastEditedMode: 'over_realism',
          updatedAt: Date.now(),
        }));
        triggerStrikeFeedback(false);
        return;
      }

      typewriterAudio.playSpacebar(soundProfile, soundVolume, soundTone);
      const step = charWidth * (0.98 + Math.random() * 0.04);
      updateActiveSheet((s) => {
        const cur = s.realismCursor ?? { x: minLeftPx, y: 0 };
        return {
          ...s,
          realismCursor: { x: Math.min(maxPhysicalPx, cur.x + step), y: cur.y },
        };
      });
      triggerStrikeFeedback(false);
      return;
    }

    // Printable character strike onto physical paper at EXACT continuous analog (x, y)
    if (e.key.length === 1) {
      e.preventDefault();

      // If steel typebars are jammed, keys clatter until released with Escape!
      if (isTypebarJammed) {
        typewriterAudio.playMarginLock(soundProfile, soundVolume, soundTone);
        return;
      }

      if (!marginReleased && realismCursor.x >= maxRightPx - 1) {
        typewriterAudio.playMarginLock(soundProfile, soundVolume, soundTone);
        flashMarginLock();
        return;
      }

      // If Correction Tape ribbon is selected, any printable key stamps chalk-white correction tape!
      if (ribbonColor === 'correction') {
        typewriterAudio.playCorrectionTape(soundProfile, soundVolume, soundTone);
        triggerStrikeFeedback(false, e.key);
        const strikeX = realismCursor.x;
        const strikeY = realismCursor.y;
        const tapeStroke: RealismStroke = {
          id: `tape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          char: ' ',
          x: strikeX,
          y: strikeY,
          jitterX: (Math.random() - 0.5) * 0.5,
          jitterY: (Math.random() - 0.5) * 0.6,
          inkAlpha: 0.98,
          rotation: (Math.random() - 0.5) * 1.4,
          color: 'correction',
        };
        const nextX = Math.min(maxPhysicalPx, strikeX + charWidth * 0.96);
        updateActiveSheet((s) => ({
          ...s,
          realismStrokes: [...(s.realismStrokes ?? []), tapeStroke],
          realismCursor: { x: nextX, y: strikeY },
          lastEditedMode: 'over_realism',
          updatedAt: Date.now(),
        }));
        return;
      }

      // Authentic mechanical typebar jam if two different keys are mashed within 36ms!
      const nowMs = performance.now();
      if (
        settings.typebarJamEnabled &&
        lastStrikeKeyRef.current !== '' &&
        lastStrikeKeyRef.current !== e.key &&
        nowMs - lastStrikeTimeRef.current < 36
      ) {
        setIsTypebarJammed(true);
        typewriterAudio.playTypebarJam(soundProfile, soundVolume, soundTone);
        lastStrikeTimeRef.current = 0;
        lastStrikeKeyRef.current = '';
        return;
      }
      lastStrikeTimeRef.current = nowMs;
      lastStrikeKeyRef.current = e.key;

      typewriterAudio.playKeyStrike(soundProfile, soundVolume, soundTone, e.key);
      triggerStrikeFeedback(false, e.key);

      const strikeX = realismCursor.x;
      const strikeY = realismCursor.y;
      const metrics = generatePhysicalStrikeMetrics(
        e.key,
        settings.imperfectionIntensity,
        settings.imperfectionPreset,
        activeRibbonInk,
        settings.ribbonDepletionEnabled
      );

      const newStroke: RealismStroke = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        char: e.key,
        x: strikeX,
        y: strikeY,
        jitterX: metrics.jitterX,
        jitterY: metrics.jitterY,
        inkAlpha: metrics.inkAlpha,
        rotation: metrics.rotation,
        ghostOffset: metrics.ghostOffset,
        scaleY: metrics.scaleY,
        color: ribbonColor,
      };

      // Slight mechanical escapement variance
      const advance = charWidth * (0.985 + Math.random() * 0.03);
      const nextX = Math.min(maxPhysicalPx, strikeX + advance);

      updateActiveSheet((s) => {
        const curInk = typeof s.ribbonInk === 'number' ? s.ribbonInk : 100;
        const nextInk = settings.ribbonDepletionEnabled
          ? Math.max(0, Number((curInk - 0.24).toFixed(2)))
          : curInk;
        return {
          ...s,
          realismStrokes: [...(s.realismStrokes ?? []), newStroke],
          realismCursor: { x: nextX, y: strikeY },
          ribbonInk: nextInk,
          lastEditedMode: 'over_realism',
          updatedAt: Date.now(),
        };
      });

      // Ring margin warning bell ~6 character widths before right margin stop
      const approxLineBand = Math.round(strikeY / Math.max(12, lineHeightPx));
      const warnThreshold = Math.max(minLeftPx + charWidth * 5, maxRightPx - charWidth * 6);
      if (
        marginBell &&
        soundProfile !== 'silent' &&
        strikeX < warnThreshold &&
        nextX >= warnThreshold &&
        marginBellRungLineRef.current !== approxLineBand
      ) {
        marginBellRungLineRef.current = approxLineBand;
        typewriterAudio.playMarginBell(soundVolume * 0.92, soundTone, bellVariant);
      }
    }
  };

  const handleRealismKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (heldArrowsRef.current.has(e.key)) {
      heldArrowsRef.current.delete(e.key);
      if (heldArrowsRef.current.size === 0) {
        setIsFreeSliding(false);
        if (arrowRafRef.current) {
          cancelAnimationFrame(arrowRafRef.current);
          arrowRafRef.current = null;
        }
      }
      return;
    }

    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      typewriterAudio.playKeyRelease(settings.soundProfile, settings.soundVolume, settings.soundTone);
    }
  };

  // Raw un-snapped analog click placement on paper in Over-Realism mode
  const handleRealismFreeClick = (rawX: number, rawY: number) => {
    typewriterAudio.playPlatenTurn(
      settings.soundProfile,
      settings.soundVolume * 0.65,
      settings.soundTone
    );
    setMarginLockedAlert(false);
    updateActiveSheet((s) => ({
      ...s,
      realismCursor: { x: rawX, y: rawY },
    }));
    realismInputRef.current?.focus({ preventScroll: true });
  };

  // Gentle wheel scrolling over the stage to read earlier or later pages
  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isQuoteModalOpen) return;
    const activeCaretY = isOverRealism ? padTop + realismCursor.y : caretLocal.y;
    setManualScrollY((prev) => {
      const next = prev - e.deltaY * 0.85;
      const maxDown = Math.max(0, activeCaretY - 40);
      const maxUp = -Math.max(240, stageHeight - activeCaretY);
      return Math.max(maxUp, Math.min(maxDown, next));
    });
  };

  // Document management handlers
  const handleCreateSheet = () => {
    const newSheet: DocumentSheet = {
      id: `sheet-${Date.now()}`,
      title: `Naskah ${sheets.length + 1}`,
      content: '',
      realismStrokes: [],
      realismCursor: { x: leftMarginPx, y: 0 },
      ribbonInk: 100,
      lastEditedMode: settings.typingMode,
      syncedStandardSnapshot: '',
      updatedAt: Date.now(),
    };
    setSheets((prev) => [newSheet, ...prev]);
    setActiveSheetId(newSheet.id);
    setManualScrollY(0);
    setMarginReleased(false);
    setMarginLockedAlert(false);
    setIsSheetsOpen(false);
    lastPageIndexRef.current = 0;
    typewriterAudio.playCarriageReturn(
      settings.soundProfile,
      settings.soundVolume,
      settings.soundTone,
      settings.marginBell,
      settings.bellVariant
    );
  };

  const handleDeleteSheet = (id: string) => {
    setSheets((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((s) => s.id !== id);
      if (id === activeSheet?.id && remaining.length > 0) {
        setActiveSheetId(remaining[0].id);
      }
      return remaining;
    });
  };

  const getActivePlainText = useCallback(() => {
    if (!activeSheet) return '';
    return isOverRealism
      ? realismStrokesToPlainText(activeSheet.realismStrokes ?? [], charWidth, lineHeightPx)
      : activeSheet.content;
  }, [activeSheet, isOverRealism, charWidth, lineHeightPx]);

  const handleExportTxt = () => {
    if (!activeSheet) return;
    const blob = new Blob([getActivePlainText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (activeSheet.title.trim() || 'aksara-naskah')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '-');
    a.href = url;
    a.download = `${safeName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPaperPng = async () => {
    if (!activeSheet || isExportingPng) return;
    setIsExportingPng(true);
    try {
      await exportStyledPaperPng(activeSheet, settings, charWidth);
      setPhotoSaved(true);
      window.setTimeout(() => setPhotoSaved(false), 2000);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleOpenQuoteModal = useCallback(() => {
    let candidate = '';
    if (!isOverRealism && textareaRef.current) {
      const ta = textareaRef.current;
      if (ta.selectionStart !== ta.selectionEnd) {
        candidate = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
      }
    }
    if (!candidate) {
      const full = getActivePlainText().trim();
      if (full.length > 320) {
        const paragraphs = full.split(/\n\s*\n/).filter(Boolean);
        candidate =
          paragraphs[0] && paragraphs[0].length <= 320
            ? paragraphs[0]
            : `${full.slice(0, 290).trim()}...`;
      } else {
        candidate = full;
      }
    }
    setQuoteModalInitialText(candidate);
    setIsSheetsOpen(false);
    setIsSettingsOpen(false);
    setIsQuoteModalOpen(true);
  }, [isOverRealism, getActivePlainText]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(getActivePlainText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleToggleQuickMute = () => {
    if (settings.soundProfile === 'silent') {
      const restore =
        previousSoundProfileRef.current === 'silent' ? 'classic' : previousSoundProfileRef.current;
      updateSetting('soundProfile', restore);
    } else {
      previousSoundProfileRef.current = settings.soundProfile;
      updateSetting('soundProfile', 'silent');
    }
  };

  // Word & character metrics
  const stats = useMemo(() => {
    const plain = isOverRealism
      ? realismStrokesToPlainText(realismStrokes, charWidth, lineHeightPx)
      : content;
    const trimmed = plain.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = plain.length;
    return { words, chars };
  }, [content, realismStrokes, isOverRealism, charWidth, lineHeightPx]);

  // --- Exact Paper & Typeguide Viewport Coordinate Calculation ---
  const activeCaretLocal = isOverRealism
    ? {
        x: padX + realismCursor.x,
        y: padTop + realismCursor.y,
      }
    : caretLocal;

  const strikeLineY = Math.round(viewport.height * 0.56);

  let paperLeft: number;
  let paperTop: number;
  let guideX: number;
  let guideY: number;

  if (settings.typeguideMode === 'static') {
    guideX = Math.round(viewport.width / 2);
    guideY = strikeLineY;
    paperLeft = Math.round(guideX - activeCaretLocal.x);
    paperTop = Math.round(guideY - (activeCaretLocal.y + lineHeightPx) + manualScrollY);
  } else {
    paperLeft = Math.round((viewport.width - paperWidth) / 2);
    const idealTop = Math.min(92, Math.round(strikeLineY - (activeCaretLocal.y + lineHeightPx)));
    paperTop = Math.round(idealTop + manualScrollY);
    guideX = Math.round(paperLeft + activeCaretLocal.x);
    guideY = Math.round(paperTop + activeCaretLocal.y + lineHeightPx);
  }

  // Zero transition lag during raw continuous free-sliding so analog arrow movement feels immediate!
  const paperTransition = isFreeSliding
    ? 'none'
    : settings.typeguideMode === 'static'
      ? isCarriageReturning
        ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
        : 'transform 72ms cubic-bezier(0.2, 0.88, 0.25, 1)'
      : 'transform 130ms cubic-bezier(0.22, 1, 0.36, 1)';

  // Vintage & ink visual calculations
  const vintage = settings.vintageIntensity / 100;
  const darkness = settings.darkness / 100;

  const inkColor =
    settings.inkWear === 'faded' ? paperPreset.inkFadedColor : paperPreset.inkColor;

  const standardInkColor =
    settings.ribbonColor === 'red'
      ? paperPreset.isDark
        ? '#e06d5e'
        : '#9c261d'
      : settings.ribbonColor === 'blue'
        ? paperPreset.isDark
          ? '#79aee8'
          : '#1e4478'
        : inkColor;

  const inkOpacity =
    settings.inkWear === 'fresh' ? 0.96 : settings.inkWear === 'classic' ? 0.89 : 0.74;

  const inkTextShadow =
    vintage > 0.15
      ? paperPreset.isDark
        ? `0 0 ${(vintage * 1.4).toFixed(2)}px rgba(235, 224, 200, ${(vintage * 0.25).toFixed(2)})`
        : `0 0 ${(vintage * 1.1).toFixed(2)}px rgba(34, 24, 14, ${(vintage * 0.32).toFixed(2)})`
      : 'none';

  const safeCaretIdx = Math.max(0, Math.min(content.length, caretIndex));
  const textBeforeCaret = content.slice(0, safeCaretIdx);
  const textAfterCaret = content.slice(safeCaretIdx);

  const showTopChrome =
    chromeVisible ||
    isSettingsOpen ||
    isSheetsOpen ||
    !settings.autoFadeChrome ||
    marginLockedAlert ||
    isTypebarJammed;

  // Format date for vintage rubber stamp
  const stampDateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
        .format(new Date(activeSheet?.updatedAt || Date.now()))
        .toUpperCase();
    } catch {
      return '25 NOV 2026';
    }
  }, [activeSheet?.updatedAt]);

  // Approximate analog position readout for Over-Realism rail (in mm / decimal units so it feels analog!)
  const analogColDisplay = (realismCursor.x / Math.max(1, charWidth)).toFixed(1);
  const analogRowDisplay = (realismCursor.y / Math.max(1, lineHeightPx) + 1).toFixed(1);

  // Paginated vertical sheets geometry & page-feed sound trigger
  const realismMaxStrokeY = useMemo(() => {
    let maxY = realismCursor.y;
    for (let i = 0; i < realismStrokes.length; i++) {
      if (realismStrokes[i].y > maxY) maxY = realismStrokes[i].y;
    }
    return maxY;
  }, [realismStrokes, realismCursor.y]);

  const baseStageHeight = isOverRealism
    ? Math.max(
        Math.round(viewport.height * 1.15),
        Math.ceil(padTop + realismMaxStrokeY + lineHeightPx * 4 + padBottom)
      )
    : mirrorHeight;

  const totalPages = settings.paginationEnabled
    ? Math.max(1, Math.ceil(baseStageHeight / PAGE_CONTENT_HEIGHT_PX))
    : 1;
  const stageHeight = settings.paginationEnabled
    ? totalPages * PAGE_CONTENT_HEIGHT_PX
    : baseStageHeight;

  useEffect(() => {
    const currentPageIdx = Math.floor(Math.max(0, activeCaretLocal.y) / PAGE_CONTENT_HEIGHT_PX);
    if (settings.paginationEnabled && currentPageIdx > lastPageIndexRef.current) {
      typewriterAudio.playPaperFeed(
        settings.soundProfile,
        settings.soundVolume,
        settings.soundTone
      );
    }
    lastPageIndexRef.current = currentPageIdx;
  }, [
    activeCaretLocal.y,
    settings.paginationEnabled,
    settings.soundProfile,
    settings.soundVolume,
    settings.soundTone,
  ]);

  // Standard Mode deterministic slanted & worn mechanical letter overlay
  const showStandardImperfection =
    !isOverRealism && settings.imperfectionInStandard && settings.imperfectionIntensity > 0;

  const standardSlantedNodes = useMemo(() => {
    if (!showStandardImperfection) return null;
    const ghostColor = paperPreset.isDark
      ? 'rgba(235, 224, 200, 0.28)'
      : 'rgba(28, 22, 16, 0.28)';
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < content.length; i++) {
      const ch = content[i];
      if (ch === '\n' || ch === ' ' || ch === '\t') {
        nodes.push(ch);
        continue;
      }
      const m = getDeterministicStrikeMetrics(
        i,
        ch,
        settings.imperfectionIntensity,
        settings.imperfectionPreset
      );
      const shadowParts: string[] = [];
      if (inkTextShadow !== 'none') shadowParts.push(inkTextShadow);
      if (m.ghostOffset !== 0) {
        shadowParts.push(
          `${m.ghostOffset}px ${(m.ghostOffset * 0.45).toFixed(2)}px 0 ${ghostColor}`
        );
      }
      nodes.push(
        <span
          key={i}
          className="inline-block"
          style={{
            transform: `translate(${m.jitterX.toFixed(2)}px, ${m.jitterY.toFixed(2)}px) rotate(${m.rotation.toFixed(2)}deg) scaleY(${m.scaleY.toFixed(3)})`,
            opacity: Number(m.inkAlpha.toFixed(3)),
            textShadow: shadowParts.length > 0 ? shadowParts.join(', ') : undefined,
          }}
        >
          {ch}
        </span>
      );
    }
    return nodes;
  }, [
    showStandardImperfection,
    content,
    settings.imperfectionIntensity,
    settings.imperfectionPreset,
    inkTextShadow,
    paperPreset.isDark,
  ]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden select-none ${
        isUnlimitedPaper && !hasRepeatingGridPattern ? paperPatternClass : ''
      }`}
      style={{
        backgroundColor: isUnlimitedPaper ? paperPreset.baseBg : paperPreset.deskBg,
      }}
      onWheel={handleStageWheel}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          focusActiveEditor();
        }
      }}
    >
      {/* Hidden precision character-pitch gauge */}
      <span
        ref={charMeasureRef}
        aria-hidden="true"
        className={`pointer-events-none invisible fixed -top-96 left-0 whitespace-pre ${fontPreset.className}`}
        style={{
          fontSize: `${settings.fontSize}px`,
          letterSpacing: effectiveLetterSpacingCss,
        }}
      >
        MMMMMMMMMM
      </span>

      {/* Hidden direct keyboard input capture for Over-Realism Mode */}
      {isOverRealism && (
        <input
          ref={realismInputRef}
          type="text"
          value=""
          onChange={() => {}}
          onKeyDown={handleRealismKeyDown}
          onKeyUp={handleRealismKeyUp}
          onFocus={() => setIsEditorFocused(true)}
          onBlur={() => setIsEditorFocused(false)}
          aria-label="Papan ketik mode Over-Realism"
          className="fixed -top-96 left-0 opacity-0 pointer-events-none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      )}

      {/* Full-Viewport Seamless Unlimited Paper Texture & Vintage Atmosphere */}
      {isUnlimitedPaper ? (
        <>
          {hasRepeatingGridPattern && (
            <div
              aria-hidden="true"
              className={`pointer-events-none fixed inset-0 no-print ${paperPatternClass}`}
              style={{
                backgroundPosition: `${paperLeft}px ${paperTop}px`,
              }}
            />
          )}

          {paperPreset.imageUrl && (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 no-print"
              style={{
                backgroundImage: `url(${paperPreset.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: 'scale(1.08)',
                opacity: paperPreset.textureOpacity,
                filter: paperPreset.imageFilter,
              }}
            />
          )}

          {/* Moving tactile paper grain synced with carriage/paper movement (suppressed on modern papers at 0% vintage) */}
          {(paperPreset.category === 'classic' || vintage > 0.01) && (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 paper-grain-overlay no-print"
              style={{
                backgroundPosition: `${paperLeft}px ${paperTop}px`,
                opacity: Number(
                  (
                    (paperPreset.category === 'modern' ? 0 : 0.12) +
                    vintage * 0.24
                  ).toFixed(3)
                ),
                mixBlendMode: paperPreset.isDark ? 'soft-light' : 'multiply',
              }}
            />
          )}

          {/* Full-screen Vintage Sepia Warmth & Soft Edge Vignette */}
          {vintage > 0.01 && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 no-print"
                style={{
                  background: paperPreset.isDark
                    ? `rgba(128, 86, 38, ${(vintage * 0.14).toFixed(3)})`
                    : `rgba(156, 108, 46, ${(vintage * 0.25).toFixed(3)})`,
                  mixBlendMode: paperPreset.isDark ? 'screen' : 'multiply',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 no-print"
                style={{
                  boxShadow: `inset 0 0 ${Math.round(80 + vintage * 180)}px rgba(${
                    paperPreset.isDark ? '0, 0, 0' : '74, 46, 18'
                  }, ${(vintage * 0.45).toFixed(3)})`,
                }}
              />
            </>
          )}
        </>
      ) : (
        <div
          className="pointer-events-none fixed inset-0 no-print"
          aria-hidden="true"
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 42%, rgba(92, 72, 50, ${(0.18 * (1 - darkness * 0.75)).toFixed(3)}) 0%, rgba(10, 9, 8, 0.92) 100%)`,
          }}
        />
      )}

      {/* Top Navigation & Minimal Controls */}
      <header
        onMouseEnter={() => setChromeVisible(true)}
        className={`fixed top-0 left-0 right-0 z-30 h-14 px-5 flex items-center justify-between gap-4 transition-opacity duration-300 no-print ${
          showTopChrome ? 'opacity-100' : 'opacity-12 hover:opacity-100'
        }`}
        style={{
          background:
            'linear-gradient(180deg, rgba(16, 14, 12, 0.88) 0%, rgba(16, 14, 12, 0.48) 72%, rgba(16, 14, 12, 0) 100%)',
        }}
      >
        {/* Zone 1: Brand Wordmark & Sheet Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-brand-serif text-2xl font-semibold tracking-wide text-[#f2e8d9] whitespace-nowrap shrink-0">
            Aksara
          </span>
          <span className="text-[#6d6358] select-none" aria-hidden="true">
            /
          </span>
          <button
            type="button"
            onClick={() => {
              setIsSheetsOpen((prev) => !prev);
              setIsSettingsOpen(false);
            }}
            aria-label="Buka daftar lembar naskah"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              isSheetsOpen
                ? 'bg-[#2a231c] text-[#f3ca86]'
                : 'text-[#c9bfb2] hover:text-[#f6efe6] hover:bg-white/6'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Naskah</span>
          </button>
          <input
            type="text"
            value={activeSheet?.title ?? ''}
            onChange={(e) =>
              updateActiveSheet((s) => ({ ...s, title: e.target.value, updatedAt: Date.now() }))
            }
            placeholder="Judul naskah..."
            aria-label="Judul naskah"
            className="bg-transparent text-xs font-medium text-[#ddd4c7] placeholder:text-[#786f64] focus:text-[#faf4eb] focus:outline-none border-b border-transparent focus:border-[#e6b873]/50 py-1 w-24 sm:w-36 truncate transition-colors"
          />
        </div>

        {/* Zone 2: Quick Mode Controls & Quiet Word Count */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#14110f]/82 border border-[#f5e6cf]/10">
            <button
              type="button"
              onClick={() => updateSetting('typeguideMode', 'follow')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                settings.typeguideMode === 'follow'
                  ? 'bg-[#2d261e] text-[#f3ca86]'
                  : 'text-[#a3998c] hover:text-[#ede6dc]'
              }`}
            >
              Typeguide Ikuti
            </button>
            <button
              type="button"
              onClick={() => updateSetting('typeguideMode', 'static')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                settings.typeguideMode === 'static'
                  ? 'bg-[#2d261e] text-[#f3ca86]'
                  : 'text-[#a3998c] hover:text-[#ede6dc]'
              }`}
            >
              Kertas Bergeser
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              updateSetting('typingMode', isOverRealism ? 'standard' : 'over_realism')
            }
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
              isOverRealism
                ? 'bg-[#35241b] text-[#f4c67a] border-[#e6b873]/45'
                : 'bg-[#14110f]/75 text-[#b5aba0] border-[#f5e6cf]/10 hover:text-[#f2e8da]'
            }`}
          >
            {isOverRealism ? 'Over-Realism Aktif' : 'Over-Realism'}
          </button>

          <div className="text-xs text-[#a59b8e] tabular-nums whitespace-nowrap">
            <span>{stats.words} kata</span>
            <span className="mx-1.5 text-[#665d53]" aria-hidden="true">
              ·
            </span>
            <span>{stats.chars} karakter</span>
          </div>
        </div>

        {/* Zone 3: Save as Photo, Quick Audio, Fullscreen & Primary Settings Action */}
        <div className="flex items-center gap-1.5 shrink-0">
          <PWAInstallButton />

          <button
            type="button"
            onClick={handleOpenQuoteModal}
            aria-label="Buat kartu kutipan"
            title="Buat Kartu Kutipan (1:1, 4:5, 9:16)"
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-[#1e1a16]/90 text-[#f0dec2] border border-[#f5e6cf]/14 hover:bg-[#2a241d] transition-colors whitespace-nowrap shrink-0"
          >
            <Quote className="h-3.5 w-3.5 text-[#e6b873]" />
            <span className="hidden md:inline">Kutipan</span>
          </button>

          <button
            type="button"
            onClick={handleExportPaperPng}
            disabled={isExportingPng}
            aria-label="Simpan tulisan sebagai foto"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#1e1a16]/90 text-[#f0dec2] border border-[#f5e6cf]/14 hover:bg-[#2a241d] transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5 text-[#e6b873]" />
            <span className="hidden sm:inline">
              {isExportingPng
                ? 'Menyimpan...'
                : photoSaved
                  ? 'Foto Tersimpan'
                  : 'Simpan Foto'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleQuickMute}
            aria-label={
              settings.soundProfile === 'silent' ? 'Aktifkan suara ketik' : 'Bisukan suara ketik'
            }
            title={
              settings.soundProfile === 'silent' ? 'Aktifkan suara ketik' : 'Bisukan suara ketik'
            }
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-[#c2b8aa] hover:text-[#f6efe6] hover:bg-white/6 transition-colors"
          >
            {settings.soundProfile === 'silent' ? (
              <VolumeX className="h-4 w-4 text-[#8d8377]" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
            title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#c2b8aa] hover:text-[#f6efe6] hover:bg-white/6 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSettingsOpen((prev) => !prev);
              setIsSheetsOpen(false);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
              isSettingsOpen
                ? 'bg-[#e6b873] text-[#17130f] border-[#e6b873]'
                : 'bg-[#221d18]/90 text-[#f2e8da] border-[#f5e6cf]/14 hover:bg-[#2c251f]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Pengaturan</span>
          </button>
        </div>
      </header>

      {/* Sleek Top Ribbon & Carriage Rail (margins moved to direct ruler drag + Settings for a cleaner canvas) */}
      <div
        onMouseEnter={() => setChromeVisible(true)}
        className={`fixed top-14 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-3.5 py-1.5 rounded-lg bg-[#171411]/86 border border-[#f5e6cf]/11 backdrop-blur-md text-[11px] text-[#d3cabd] shadow-lg transition-opacity duration-300 no-print max-w-[95vw] ${
          showTopChrome ? 'opacity-100' : 'opacity-12 hover:opacity-100'
        }`}
      >

        {/* Ink Ribbon Selector (Black, Blue, Red across all modes + White Correction Tape in Over-Realism) */}
        <div className="flex items-center gap-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => {
              updateSetting('ribbonColor', 'black');
              focusActiveEditor();
            }}
            className={`px-2 py-0.5 rounded transition-colors ${
              settings.ribbonColor === 'black'
                ? 'bg-[#2e2822] text-[#f4efe7] font-medium'
                : 'text-[#8e8478] hover:text-[#e5ddd2]'
            }`}
          >
            Hitam
          </button>
          <button
            type="button"
            onClick={() => {
              updateSetting('ribbonColor', 'blue');
              focusActiveEditor();
            }}
            className={`px-2 py-0.5 rounded transition-colors ${
              settings.ribbonColor === 'blue'
                ? 'bg-[#192e4a] text-[#8dc2f8] font-medium'
                : 'text-[#8e8478] hover:text-[#8dc2f8]'
            }`}
          >
            Biru
          </button>
          <button
            type="button"
            onClick={() => {
              updateSetting('ribbonColor', 'red');
              focusActiveEditor();
            }}
            className={`px-2 py-0.5 rounded transition-colors ${
              settings.ribbonColor === 'red'
                ? 'bg-[#421f1c] text-[#f29587] font-medium'
                : 'text-[#8e8478] hover:text-[#f29587]'
            }`}
          >
            Merah
          </button>
          {isOverRealism && (
            <button
              type="button"
              onClick={() => {
                updateSetting('ribbonColor', 'correction');
                focusActiveEditor();
              }}
              title="Pita koreksi putih (atau tekan Ctrl/Shift + Backspace untuk tutup huruf sebelumnya)"
              className={`px-2 py-0.5 rounded transition-colors ${
                settings.ribbonColor === 'correction'
                  ? 'bg-[#ede9e0] text-[#1c1814] font-semibold'
                  : 'text-[#8e8478] hover:text-[#f4efe7]'
              }`}
            >
              Koreksi
            </button>
          )}
        </div>

        {isOverRealism && (
          <>
            {settings.ribbonDepletionEnabled && (
              <>
                <span className="text-[#564e45]" aria-hidden="true">
                  |
                </span>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className={`font-mono tabular-nums ${
                      activeRibbonInk < 25 ? 'text-[#f29587] font-semibold' : 'text-[#b5aba0]'
                    }`}
                  >
                    Pita {Math.round(activeRibbonInk)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleSwapRibbon}
                    title="Pasang gulungan pita tinta baru (100%)"
                    className={`px-2 py-0.5 rounded transition-colors font-medium ${
                      activeRibbonInk < 25
                        ? 'bg-[#e6b873] text-[#17130f] hover:bg-[#f0c784]'
                        : 'bg-white/7 text-[#d4cabd] hover:bg-white/14'
                    }`}
                  >
                    Ganti Pita
                  </button>
                </div>
              </>
            )}

            <span className="text-[#564e45]" aria-hidden="true">
              |
            </span>

            {/* Margin Release (MR) Lever */}
            <button
              type="button"
              onClick={() => {
                setMarginReleased((prev) => !prev);
                setMarginLockedAlert(false);
                typewriterAudio.playPlatenTurn(
                  settings.soundProfile,
                  settings.soundVolume,
                  settings.soundTone
                );
                focusActiveEditor();
              }}
              title="Lepas kunci margin kanan sementara (Margin Release)"
              className={`px-2 py-0.5 rounded font-medium transition-colors whitespace-nowrap ${
                marginReleased
                  ? 'bg-[#422a1b] text-[#f5c476]'
                  : 'bg-white/6 text-[#b8afa2] hover:text-[#f5efe6]'
              }`}
            >
              {marginReleased ? 'MR Terbuka' : 'Lepas Margin (MR)'}
            </button>

            <span className="text-[#564e45]" aria-hidden="true">
              ·
            </span>

            <span
              className={`font-mono tabular-nums whitespace-nowrap ${
                marginLockedAlert || isTypebarJammed ? 'text-[#f29587] font-semibold' : 'text-[#9e9487]'
              }`}
            >
              {isTypebarJammed
                ? 'Tuas macet!'
                : marginLockedAlert
                  ? 'Terkunci di margin kanan — tekan Enter atau MR'
                  : `Baris ${analogRowDisplay} · Pos ${analogColDisplay}`}
            </span>

            {isTypebarJammed && (
              <button
                type="button"
                onClick={handleUnjamTypebars}
                className="px-2.5 py-0.5 rounded bg-[#4e211c] hover:bg-[#662a23] text-[#ffd1c9] font-semibold transition-colors whitespace-nowrap"
              >
                Lepas Tuas (Esc)
              </button>
            )}
          </>
        )}
      </div>

      {/* Physical Moving/Centered Paper Sheet Stage */}
      <main
        className="relative h-full w-full overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            focusActiveEditor();
          }
        }}
      >
        <div
          className={`absolute left-0 top-0 will-change-transform motion-safe-transition ${
            !isUnlimitedPaper ? 'rounded-[2px]' : ''
          } ${!isUnlimitedPaper ? paperPatternClass : ''}`}
          style={{
            width: `${paperWidth}px`,
            minHeight: `${stageHeight}px`,
            transform: `translate3d(${paperLeft}px, ${
              paperTop + (strikePulse && settings.typebarAnimation ? 0.75 : 0)
            }px, 0)`,
            transition: paperTransition,
            backgroundColor: isUnlimitedPaper ? 'transparent' : paperPreset.baseBg,
            boxShadow: isUnlimitedPaper
              ? 'none'
              : '0 28px 90px rgba(0, 0, 0, 0.62), 0 4px 18px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 245, 228, 0.08)',
          }}
          onClick={focusActiveEditor}
        >
          {/* Interactive Top-of-Paper Mechanical Margin & Tab Ruler */}
          {settings.showTabRuler && (
            <TabRuler
              padX={padX}
              printableWidth={printableWidth}
              marginLeft={settings.marginLeft}
              marginRight={settings.marginRight}
              tabStops={settings.tabStops}
              stageHeight={stageHeight}
              isDarkPaper={paperPreset.isDark}
              onToggleTabStop={handleToggleTabStop}
              onChangeMarginLeft={(pct) => updateSetting('marginLeft', pct)}
              onChangeMarginRight={(pct) => updateSetting('marginRight', pct)}
            />
          )}

          {/* Vintage / Custom Rubber Stamp on the top-right corner of the paper */}
          {settings.stampStyle && settings.stampStyle !== 'none' && (() => {
            const isRedStamp =
              settings.stampStyle === 'date_red' || settings.stampStyle === 'archive_red';
            const isDoubleFrame =
              settings.stampStyle === 'archive_red' || settings.stampStyle === 'archive_ink';
            const customLabel = (settings.stampCustomText ?? '').trim().toUpperCase();
            const showDate = settings.stampShowDate !== false;
            const topLine = isDoubleFrame
              ? showDate
                ? customLabel || 'ARSIP · AKSARA'
                : ''
              : customLabel && showDate
                ? customLabel
                : '';
            const mainLine = isDoubleFrame
              ? showDate
                ? stampDateLabel
                : customLabel || 'ARSIP · AKSARA'
              : customLabel && showDate
                ? stampDateLabel
                : customLabel || stampDateLabel;

            return (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-10 select-none"
                style={{
                  top: settings.showTabRuler ? '46px' : '28px',
                  right: `${padX}px`,
                  transform: 'rotate(-4.5deg)',
                  color: isRedStamp
                    ? paperPreset.isDark
                      ? 'rgba(230, 108, 92, 0.74)'
                      : 'rgba(158, 38, 30, 0.70)'
                    : paperPreset.isDark
                      ? 'rgba(230, 222, 208, 0.58)'
                      : 'rgba(42, 36, 30, 0.56)',
                }}
              >
                {isDoubleFrame ? (
                  <div className="border-2 border-current p-[2px]">
                    <div className="border border-current px-3 py-1 text-center leading-tight">
                      {topLine && (
                        <div className="font-typewriter-courier text-[9px] font-bold tracking-[0.2em]">
                          {topLine}
                        </div>
                      )}
                      <div
                        className={`font-typewriter-special text-xs font-bold tracking-wider ${
                          topLine ? 'mt-0.5' : ''
                        }`}
                      >
                        {mainLine}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-[1.5px] border-current px-3 py-1 text-center leading-tight">
                    {topLine && (
                      <div className="font-typewriter-courier text-[9px] font-bold tracking-[0.18em]">
                        {topLine}
                      </div>
                    )}
                    <div
                      className={`font-typewriter-special text-xs font-bold tracking-wider ${
                        topLine ? 'mt-0.5' : ''
                      }`}
                    >
                      {mainLine}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Sheet-only Paper Fiber & Vintage Layers */}
          {!isUnlimitedPaper && paperPreset.imageUrl && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[2px]"
              style={{
                backgroundImage: `url(${paperPreset.imageUrl})`,
                backgroundSize: '100% auto',
                backgroundRepeat: 'repeat-y',
                opacity: paperPreset.textureOpacity,
                filter: paperPreset.imageFilter,
              }}
            />
          )}

          {!isUnlimitedPaper && vintage > 0.01 && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[2px] no-print"
                style={{
                  background: paperPreset.isDark
                    ? `rgba(128, 86, 38, ${(vintage * 0.14).toFixed(3)})`
                    : `rgba(156, 108, 46, ${(vintage * 0.25).toFixed(3)})`,
                  mixBlendMode: paperPreset.isDark ? 'screen' : 'multiply',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[2px] no-print"
                style={{
                  boxShadow: `inset 0 0 ${Math.round(38 + vintage * 115)}px rgba(${
                    paperPreset.isDark ? '0, 0, 0' : '74, 46, 18'
                  }, ${(vintage * 0.48).toFixed(3)})`,
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[2px] paper-grain-overlay no-print"
                style={{
                  opacity: Number((vintage * 0.28).toFixed(3)),
                  mixBlendMode: paperPreset.isDark ? 'soft-light' : 'multiply',
                }}
              />
            </>
          )}

          {/* Custom Crisp Caret Synchronized with Typeguide */}
          {isEditorFocused && (isOverRealism || !hasSelection) && (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute left-0 top-0 z-10 rounded-[1px] no-print ${
                isTypingActive || isFreeSliding ? 'aksara-caret-typing' : 'aksara-caret'
              }`}
              style={{
                width: isOverRealism ? '2.5px' : '2.2px',
                height: `${Math.round(settings.fontSize * 1.24)}px`,
                transform: `translate3d(${activeCaretLocal.x.toFixed(1)}px, ${(
                  activeCaretLocal.y +
                  (lineHeightPx - settings.fontSize * 1.24) / 2
                ).toFixed(1)}px, 0)`,
                backgroundColor:
                  isOverRealism && settings.ribbonColor === 'correction'
                    ? '#f7f4ec'
                    : settings.ribbonColor === 'red'
                      ? paperPreset.isDark
                        ? '#f08275'
                        : '#a8291e'
                      : settings.ribbonColor === 'blue'
                        ? paperPreset.isDark
                          ? '#79aee8'
                          : '#1e4478'
                        : settings.lightEnabled
                          ? paperPreset.isDark
                            ? lightPreset.coreHex
                            : paperPreset.caretColor
                          : paperPreset.caretColor,
                boxShadow:
                  isOverRealism && settings.ribbonColor === 'correction'
                    ? '0 0 0 1px rgba(20, 16, 12, 0.45), 0 0 8px rgba(255, 252, 245, 0.75)'
                    : settings.lightEnabled
                      ? `0 0 8px rgba(${lightPreset.rgb}, 0.65)`
                      : 'none',
              }}
            />
          )}

          {/* Paginated Vertical Sheet Separators & Centered Page Numbers */}
          {settings.paginationEnabled &&
            Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const pageEndY = pageNum * PAGE_CONTENT_HEIGHT_PX;
              return (
                <React.Fragment key={`page-chrome-${pageNum}`}>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 right-0 z-20 flex justify-center select-none no-print"
                    style={{
                      top: `${pageEndY - 38}px`,
                      color: paperPreset.isDark
                        ? 'rgba(232, 226, 214, 0.44)'
                        : 'rgba(55, 48, 40, 0.44)',
                    }}
                  >
                    <span className="font-typewriter-courier text-[11px] tracking-[0.22em] tabular-nums">
                      — {pageNum} —
                    </span>
                  </div>

                  {pageNum < totalPages && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute z-20 select-none no-print"
                      style={{
                        top: `${pageEndY - 14}px`,
                        left: isUnlimitedPaper ? '-100vw' : '-2px',
                        right: isUnlimitedPaper ? '-100vw' : '-2px',
                        height: '28px',
                        backgroundColor: paperPreset.deskBg,
                        borderTop: paperPreset.isDark
                          ? '1px solid rgba(255, 255, 255, 0.08)'
                          : '1px solid rgba(0, 0, 0, 0.14)',
                        borderBottom: paperPreset.isDark
                          ? '1px solid rgba(255, 255, 255, 0.08)'
                          : '1px solid rgba(0, 0, 0, 0.14)',
                        boxShadow:
                          'inset 0 8px 14px -8px rgba(0, 0, 0, 0.62), inset 0 -8px 14px -8px rgba(0, 0, 0, 0.48)',
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}

          {isOverRealism ? (
            <OverRealismCanvas
              strokes={realismStrokes}
              cursor={realismCursor}
              charWidth={charWidth}
              lineHeightPx={lineHeightPx}
              fontSize={settings.fontSize}
              fontClassName={fontPreset.className}
              padX={padX}
              padTop={padTop}
              padBottom={padBottom}
              minHeight={Math.round(viewport.height * 1.15)}
              leftMarginPx={leftMarginPx}
              rightMarginPx={rightMarginPx}
              maxPhysicalPx={maxPhysicalPx}
              isDarkPaper={paperPreset.isDark}
              paperBaseBg={paperPreset.baseBg}
              inkColor={inkColor}
              inkOpacity={inkOpacity}
              inkTextShadow={inkTextShadow}
              paginationEnabled={settings.paginationEnabled}
              showMarginBrackets={!settings.showTabRuler}
              showRightMarginGuide={marginLockedAlert}
              onFreePositionClick={handleRealismFreeClick}
            />
          ) : (
            <>
              {/* Clean unobstructed paper surface (margin guide lines appear on TabRuler hover/drag) */}

              {/* Hidden Mirror Div for Exact Caret (X, Y) Tracking in Standard Mode */}
              <div
                ref={mirrorRef}
                aria-hidden="true"
                className={`pointer-events-none invisible absolute inset-0 whitespace-pre-wrap break-words ${fontPreset.className}`}
                style={{
                  paddingTop: `${padTop}px`,
                  paddingBottom: `${padBottom}px`,
                  paddingLeft: `${standardPadLeft}px`,
                  paddingRight: `${standardPadRight}px`,
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: `${lineHeightPx}px`,
                  letterSpacing: effectiveLetterSpacingCss,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                <span>{textBeforeCaret}</span>
                <span
                  ref={caretMarkerRef}
                  className="inline-block w-0 align-top"
                  style={{ height: `${lineHeightPx}px` }}
                >
                  &#8203;
                </span>
                <span>{textAfterCaret}</span>
                {'\n'}
              </div>

              {/* Deterministic Mechanical Slant Overlay for Standard Mode */}
              {showStandardImperfection && (
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 z-[5] whitespace-pre-wrap break-words select-none ${fontPreset.className}`}
                  style={{
                    height: `${stageHeight}px`,
                    paddingTop: `${padTop}px`,
                    paddingBottom: `${padBottom}px`,
                    paddingLeft: `${standardPadLeft}px`,
                    paddingRight: `${standardPadRight}px`,
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: `${lineHeightPx}px`,
                    letterSpacing: effectiveLetterSpacingCss,
                    color: standardInkColor,
                    opacity: inkOpacity,
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {standardSlantedNodes}
                </div>
              )}

              {/* Standard Tactile Writing Textarea respecting Left & Right Margins */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleStandardChange}
                onKeyDown={handleStandardKeyDown}
                onKeyUp={handleStandardKeyUp}
                onClick={syncCaretFromTextarea}
                onSelect={syncCaretFromTextarea}
                onFocus={() => {
                  setIsEditorFocused(true);
                  syncCaretFromTextarea();
                }}
                onBlur={() => setIsEditorFocused(false)}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                aria-label="Lembar ketikan Aksara"
                placeholder="Mulai mengetik di sini..."
                className={`relative z-10 block w-full resize-none bg-transparent outline-none caret-transparent select-text ${
                  showStandardImperfection ? 'placeholder:text-[#8c8173]/55' : ''
                } ${fontPreset.className}`}
                style={{
                  height: `${stageHeight}px`,
                  paddingTop: `${padTop}px`,
                  paddingBottom: `${padBottom}px`,
                  paddingLeft: `${standardPadLeft}px`,
                  paddingRight: `${standardPadRight}px`,
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: `${lineHeightPx}px`,
                  letterSpacing: effectiveLetterSpacingCss,
                  color: showStandardImperfection ? 'transparent' : standardInkColor,
                  opacity: showStandardImperfection ? 1 : inkOpacity,
                  textShadow: showStandardImperfection ? 'none' : inkTextShadow,
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              />
            </>
          )}
        </div>
      </main>

      {/* Illuminated Metallic Typeguide + Upward Light Cone + Darkness Spotlight + Flying Typebar */}
      <TypeguideOverlay
        x={guideX}
        y={guideY}
        lineHeight={lineHeightPx}
        settings={settings}
        isDarkPaper={paperPreset.isDark}
        isCarriageReturning={isCarriageReturning}
        strikePulse={strikePulse}
        strikeAngle={strikeAngle}
        isTypebarJammed={isTypebarJammed}
      />

      {manualScrollY !== 0 && (
        <button
          type="button"
          onClick={() => {
            setManualScrollY(0);
            focusActiveEditor();
          }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg bg-[#1c1815]/90 border border-[#e6b873]/30 text-xs font-medium text-[#f0d098] shadow-lg backdrop-blur-md hover:bg-[#27211c] transition-colors no-print whitespace-nowrap"
        >
          Kembali ke posisi ketikan
        </button>
      )}

      {/* Slide-over Sheets Manager (Left) */}
      <SheetsPopover
        isOpen={isSheetsOpen}
        onClose={() => setIsSheetsOpen(false)}
        sheets={sheets}
        activeSheetId={activeSheet?.id ?? ''}
        onSelectSheet={(id) => {
          setActiveSheetId(id);
          setManualScrollY(0);
          setMarginReleased(false);
          setMarginLockedAlert(false);
          setIsTypebarJammed(false);
          lastPageIndexRef.current = 0;
        }}
        onCreateSheet={handleCreateSheet}
        onDeleteSheet={handleDeleteSheet}
        onExportPaperPng={handleExportPaperPng}
        onOpenQuoteModal={handleOpenQuoteModal}
        isExportingPng={isExportingPng}
        photoSaved={photoSaved}
        onExportTxt={handleExportTxt}
        onCopyText={handleCopyText}
        onPrint={() => window.print()}
        copied={copied}
        isOverRealism={isOverRealism}
        charWidth={charWidth}
        lineHeightPx={lineHeightPx}
      />

      {/* Live Slide-over Customization Drawer (Right) */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        ribbonInk={activeRibbonInk}
        onSwapRibbon={handleSwapRibbon}
        onUpdate={updateSetting}
        onApplyPatch={applySettingsPatch}
        onReset={handleResetSettings}
      />

      {/* Studio Kartu Kutipan (1:1, 4:5, 9:16 PNG) */}
      <QuoteCardModal
        isOpen={isQuoteModalOpen}
        onClose={() => {
          setIsQuoteModalOpen(false);
          focusActiveEditor();
        }}
        initialText={quoteModalInitialText}
        defaultTitle={activeSheet?.title ?? ''}
        timestamp={activeSheet?.updatedAt ?? Date.now()}
        settings={settings}
      />

      <OfflineIndicator />
    </div>
  );
}
