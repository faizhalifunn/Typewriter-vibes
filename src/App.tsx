import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  FileText,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ambientAudio } from './audio/ambientAudio';
import { typewriterAudio } from './audio/typewriterAudio';
import { OverRealismCanvas } from './components/OverRealismCanvas';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { SettingsDrawer } from './components/SettingsDrawer';
import { SheetsPopover } from './components/SheetsPopover';
import { TypeguideOverlay } from './components/TypeguideOverlay';
import {
  DEFAULT_SETTINGS,
  FONT_PRESETS,
  INITIAL_WELCOME_TEXT,
  LINE_SPACING_VALUES,
  PAPER_PRESETS,
  temperatureToLightColors,
} from './constants/presets';
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
} from './types';

const STORAGE_SETTINGS_KEY = 'aksara_settings_v1';
const STORAGE_SHEETS_KEY = 'aksara_sheets_v1';
const STORAGE_ACTIVE_SHEET_KEY = 'aksara_active_sheet_v1';

function loadSavedSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
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
      marginLeft:
        typeof parsed.marginLeft === 'number' ? parsed.marginLeft : DEFAULT_SETTINGS.marginLeft,
      marginRight:
        typeof parsed.marginRight === 'number' ? parsed.marginRight : DEFAULT_SETTINGS.marginRight,
      ribbonColor:
        parsed.ribbonColor === 'red' || parsed.ribbonColor === 'black'
          ? parsed.ribbonColor
          : DEFAULT_SETTINGS.ribbonColor,
      typebarAnimation:
        typeof parsed.typebarAnimation === 'boolean'
          ? parsed.typebarAnimation
          : DEFAULT_SETTINGS.typebarAnimation,
      typebarJamEnabled:
        typeof parsed.typebarJamEnabled === 'boolean'
          ? parsed.typebarJamEnabled
          : DEFAULT_SETTINGS.typebarJamEnabled,
      stampStyle: parsed.stampStyle ?? DEFAULT_SETTINGS.stampStyle,
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
  const previousSoundProfileRef = useRef(settings.soundProfile);
  const lastStrikeTimeRef = useRef<number>(0);
  const lastStrikeKeyRef = useRef<string>('');

  // Continuous analog arrow-key glide refs for Over-Realism mode
  const heldArrowsRef = useRef<Set<string>>(new Set());
  const arrowRafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const slideSoundAccumRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  const charWidthRef = useRef(charWidth);
  const marginReleasedRef = useRef(marginReleased);

  settingsRef.current = settings;
  charWidthRef.current = charWidth;
  marginReleasedRef.current = marginReleased;

  const isOverRealism = settings.typingMode === 'over_realism';

  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.id === activeSheetId) ?? sheets[0];
  }, [sheets, activeSheetId]);

  const content = activeSheet?.content ?? '';
  const realismStrokes: RealismStroke[] = activeSheet?.realismStrokes ?? [];
  const realismCursor: RealismCursor = activeSheet?.realismCursor ?? {
    x: settings.marginLeft * charWidth,
    y: 0,
  };

  // Derived visual geometry
  const paperPreset = PAPER_PRESETS[settings.paperTexture];
  const fontPreset = FONT_PRESETS[settings.fontId];
  const lightPreset = temperatureToLightColors(settings.lightTemperature);
  const lineHeightRatio = LINE_SPACING_VALUES[settings.lineSpacing];
  const lineHeightPx = Math.round(settings.fontSize * lineHeightRatio);
  const isUnlimitedPaper = settings.paperLayout === 'unlimited';

  const isCompactViewport = viewport.width < 820;
  const paperWidth = isCompactViewport
    ? Math.max(300, viewport.width - 28)
    : isUnlimitedPaper
      ? 860
      : 780;
  const padX = isCompactViewport ? 28 : 68;
  const padTop = isCompactViewport ? 72 : 108;
  const padBottom = Math.max(360, Math.round(viewport.height * 0.52));

  // Shared Left & Right Margin physical pixel offsets (applies to BOTH Standard & Over-Realism!)
  const leftMarginPx = settings.marginLeft * charWidth;
  const rightMarginPx = settings.marginRight * charWidth;
  const standardPadLeft = Math.round(padX + leftMarginPx);
  const standardPadRight = Math.max(
    padX,
    Math.round(paperWidth - (padX + rightMarginPx))
  );

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

  // Imprint existing Standard text into free-flow Over-Realism strokes on first entry
  useEffect(() => {
    if (!isOverRealism || !activeSheet) return;
    if (activeSheet.realismStrokes === undefined) {
      const converted = textToRealismStrokes(
        activeSheet.content,
        settings.marginLeft,
        settings.marginRight,
        charWidth,
        lineHeightPx
      );
      setSheets((prev) =>
        prev.map((s) =>
          s.id === activeSheet.id
            ? {
                ...s,
                realismStrokes: converted.strokes,
                realismCursor: converted.cursor,
              }
            : s
        )
      );
    }
  }, [isOverRealism, activeSheet, settings.marginLeft, settings.marginRight, charWidth, lineHeightPx]);

  // Sync ambient background music engine
  useEffect(() => {
    ambientAudio.setTrack(settings.ambientTrack, settings.ambientVolume);
  }, [settings.ambientTrack]);

  useEffect(() => {
    ambientAudio.setVolume(settings.ambientVolume);
  }, [settings.ambientVolume]);

  useEffect(() => {
    return () => {
      ambientAudio.stopCurrent();
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

  const updateSetting = useCallback(
    <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
      setSettings((prev) => {
        if (key === 'soundProfile' && value !== 'silent') {
          previousSoundProfileRef.current = value as EditorSettings['soundProfile'];
        }
        return { ...prev, [key]: value };
      });
    },
    []
  );

  const applySettingsPatch = useCallback((patch: Partial<EditorSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

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
      const cw = charWidthRef.current;
      const maxX = (marginReleasedRef.current ? 84 : s.marginRight) * cw;

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
          const cur = sheet.realismCursor ?? { x: s.marginLeft * cw, y: 0 };
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

    const { soundProfile, soundVolume, soundTone, marginBell, bellVariant, marginLeft, marginRight } =
      settings;

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
      const next = content.slice(0, start) + '    ' + content.slice(end);
      updateActiveSheet((s) => ({ ...s, content: next, updatedAt: Date.now() }));
      requestAnimationFrame(() => {
        ta.setSelectionRange(start + 4, start + 4);
        setCaretIndex(start + 4);
      });
      typewriterAudio.playSpacebar(soundProfile, soundVolume, soundTone);
      triggerStrikeFeedback(false);
      return;
    }

    if (e.key.length === 1) {
      typewriterAudio.playKeyStrike(soundProfile, soundVolume, soundTone, e.key);
      triggerStrikeFeedback(false, e.key);

      // Ring margin warning bell near the user's configured Right Margin!
      if (marginBell && soundProfile !== 'silent') {
        const ta = e.currentTarget;
        const before = ta.value.slice(0, ta.selectionStart);
        const lines = before.split('\n');
        const currentLineIdx = lines.length - 1;
        const usableCols = Math.max(14, marginRight - marginLeft);
        const warnAt = Math.max(8, usableCols - 6);
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
    updateActiveSheet((s) => ({ ...s, content: e.target.value, updatedAt: Date.now() }));
    setCaretIndex(e.target.selectionStart);
    setHasSelection(e.target.selectionStart !== e.target.selectionEnd);
  };

  // --- OVER-REALISM PHYSICAL FREE-FLOW TYPEWRITER HANDLERS ---
  const handleRealismKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleExportPaperPng();
      }
      return;
    }

    const {
      soundProfile,
      soundVolume,
      soundTone,
      marginBell,
      bellVariant,
      marginLeft,
      marginRight,
      ribbonColor,
    } = settings;

    const minLeftPx = marginLeft * charWidth;
    const maxRightPx = marginRight * charWidth;
    const maxPhysicalPx = 84 * charWidth;

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

    // Tab: mechanical tabulator jump (~5 character pitches)
    if (e.key === 'Tab') {
      e.preventDefault();
      const capX = marginReleased ? maxPhysicalPx : maxRightPx;
      typewriterAudio.playSpacebar(soundProfile, soundVolume, soundTone);
      updateActiveSheet((s) => {
        const cur = s.realismCursor ?? { x: minLeftPx, y: 0 };
        return {
          ...s,
          realismCursor: { x: Math.min(capX, cur.x + charWidth * 5), y: cur.y },
        };
      });
      triggerStrikeFeedback(false);
      return;
    }

    // Spacebar: advances carriage 1 pitch without striking ink
    if (e.key === ' ') {
      e.preventDefault();
      if (!marginReleased && realismCursor.x >= maxRightPx - 1) {
        typewriterAudio.playMarginLock(soundProfile, soundVolume, soundTone);
        flashMarginLock();
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
      const newStroke: RealismStroke = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        char: e.key,
        x: strikeX,
        y: strikeY,
        jitterX: (Math.random() - 0.5) * 0.85,
        jitterY: (Math.random() - 0.5) * 1.55,
        inkAlpha: 0.78 + Math.random() * 0.22,
        rotation: (Math.random() - 0.5) * 1.25,
        color: ribbonColor,
      };

      // Slight mechanical escapement variance
      const advance = charWidth * (0.985 + Math.random() * 0.03);
      const nextX = Math.min(maxPhysicalPx, strikeX + advance);

      updateActiveSheet((s) => ({
        ...s,
        realismStrokes: [...(s.realismStrokes ?? []), newStroke],
        realismCursor: { x: nextX, y: strikeY },
        updatedAt: Date.now(),
      }));

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

  // Gentle wheel scrolling over the stage to read earlier text
  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const activeCaretY = isOverRealism ? padTop + realismCursor.y : caretLocal.y;
    setManualScrollY((prev) => {
      const next = prev - e.deltaY * 0.85;
      const maxDown = Math.max(0, activeCaretY - 40);
      const maxUp = -Math.max(240, mirrorHeight - activeCaretY);
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
      realismCursor: { x: settings.marginLeft * charWidth, y: 0 },
      updatedAt: Date.now(),
    };
    setSheets((prev) => [newSheet, ...prev]);
    setActiveSheetId(newSheet.id);
    setManualScrollY(0);
    setMarginReleased(false);
    setMarginLockedAlert(false);
    setIsSheetsOpen(false);
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

  return (
    <div
      className={`relative h-full w-full overflow-hidden select-none ${
        isUnlimitedPaper && paperPreset.isDark ? 'paper-charcoal-texture' : ''
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
          letterSpacing: fontPreset.isMono ? '0.01em' : '0.005em',
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

          {/* Moving tactile paper grain synced with carriage/paper movement */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 paper-grain-overlay no-print"
            style={{
              backgroundPosition: `${paperLeft}px ${paperTop}px`,
              opacity: Number((0.12 + vintage * 0.24).toFixed(3)),
              mixBlendMode: paperPreset.isDark ? 'soft-light' : 'multiply',
            }}
          />

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

      {/* Unified Carriage & Margin Rail (Margin Kiri/Kanan for BOTH Standard & Over-Realism; Bichrome & MR for Over-Realism) */}
      <div
        onMouseEnter={() => setChromeVisible(true)}
        className={`fixed top-14 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 px-4 py-1.5 rounded-lg bg-[#171411]/86 border border-[#f5e6cf]/11 backdrop-blur-md text-[11px] text-[#d3cabd] shadow-lg transition-opacity duration-300 no-print max-w-[95vw] ${
          showTopChrome ? 'opacity-100' : 'opacity-12 hover:opacity-100'
        }`}
      >
        {/* Left Margin Control (Active in both Standard & Over-Realism) */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[#968c7f]">Margin Kiri</span>
          <button
            type="button"
            onClick={() => {
              updateSetting('marginLeft', Math.max(0, settings.marginLeft - 2));
              focusActiveEditor();
            }}
            className="h-5 w-5 rounded bg-white/8 hover:bg-white/15 text-[#f2e8da] inline-flex items-center justify-center"
            aria-label="Geser margin kiri ke kiri"
          >
            −
          </button>
          <span className="font-mono tabular-nums w-5 text-center">{settings.marginLeft}</span>
          <button
            type="button"
            onClick={() => {
              updateSetting(
                'marginLeft',
                Math.min(settings.marginRight - 16, settings.marginLeft + 2)
              );
              focusActiveEditor();
            }}
            className="h-5 w-5 rounded bg-white/8 hover:bg-white/15 text-[#f2e8da] inline-flex items-center justify-center"
            aria-label="Geser margin kiri ke kanan"
          >
            +
          </button>
        </div>

        <span className="text-[#564e45]" aria-hidden="true">
          |
        </span>

        {/* Right Margin Control (Active in both Standard & Over-Realism) */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[#968c7f]">Margin Kanan</span>
          <button
            type="button"
            onClick={() => {
              updateSetting(
                'marginRight',
                Math.max(settings.marginLeft + 16, settings.marginRight - 2)
              );
              focusActiveEditor();
            }}
            className="h-5 w-5 rounded bg-white/8 hover:bg-white/15 text-[#f2e8da] inline-flex items-center justify-center"
            aria-label="Geser margin kanan ke kiri"
          >
            −
          </button>
          <span className="font-mono tabular-nums w-5 text-center">{settings.marginRight}</span>
          <button
            type="button"
            onClick={() => {
              updateSetting('marginRight', Math.min(74, settings.marginRight + 2));
              focusActiveEditor();
            }}
            className="h-5 w-5 rounded bg-white/8 hover:bg-white/15 text-[#f2e8da] inline-flex items-center justify-center"
            aria-label="Geser margin kanan ke kanan"
          >
            +
          </button>
        </div>

        {isOverRealism && (
          <>
            <span className="text-[#564e45]" aria-hidden="true">
              |
            </span>

            {/* Bichrome Ribbon Lever */}
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
                Pita Hitam
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
                Pita Merah
              </button>
            </div>

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
          } ${!isUnlimitedPaper && paperPreset.isDark ? 'paper-charcoal-texture' : ''}`}
          style={{
            width: `${paperWidth}px`,
            minHeight: `${mirrorHeight}px`,
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
          {/* Vintage Rubber Date Stamp on the top-right corner of the paper */}
          {settings.stampStyle && settings.stampStyle !== 'none' && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-10 select-none"
              style={{
                top: '28px',
                right: `${padX}px`,
                transform: 'rotate(-4.5deg)',
                color:
                  settings.stampStyle !== 'date_ink'
                    ? paperPreset.isDark
                      ? 'rgba(230, 108, 92, 0.72)'
                      : 'rgba(158, 38, 30, 0.68)'
                    : paperPreset.isDark
                      ? 'rgba(230, 222, 208, 0.56)'
                      : 'rgba(42, 36, 30, 0.54)',
              }}
            >
              {settings.stampStyle === 'archive_red' ? (
                <div className="border-2 border-current p-[2px]">
                  <div className="border border-current px-3 py-1 text-center leading-tight">
                    <div className="font-typewriter-courier text-[9px] font-bold tracking-[0.2em]">
                      ARSIP · AKSARA
                    </div>
                    <div className="font-typewriter-special text-xs font-bold tracking-wider mt-0.5">
                      {stampDateLabel}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-[1.5px] border-current px-3 py-1 text-center">
                  <div className="font-typewriter-special text-xs font-bold tracking-wider">
                    {stampDateLabel}
                  </div>
                </div>
              )}
            </div>
          )}
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
                  isOverRealism && settings.ribbonColor === 'red'
                    ? paperPreset.isDark
                      ? '#f08275'
                      : '#a8291e'
                    : settings.lightEnabled
                      ? paperPreset.isDark
                        ? lightPreset.coreHex
                        : paperPreset.caretColor
                      : paperPreset.caretColor,
                boxShadow: settings.lightEnabled
                  ? `0 0 8px rgba(${lightPreset.rgb}, 0.65)`
                  : 'none',
              }}
            />
          )}

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
              marginLeft={settings.marginLeft}
              marginRight={settings.marginRight}
              isDarkPaper={paperPreset.isDark}
              inkColor={inkColor}
              inkOpacity={inkOpacity}
              inkTextShadow={inkTextShadow}
              onFreePositionClick={handleRealismFreeClick}
            />
          ) : (
            <>
              {/* Subtle Left & Right Margin Stop markers for Standard Mode */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-4 h-3 border-l-2 border-t-2 no-print"
                style={{
                  left: `${standardPadLeft}px`,
                  width: '8px',
                  borderColor: paperPreset.isDark
                    ? 'rgba(230, 184, 115, 0.28)'
                    : 'rgba(130, 88, 42, 0.30)',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-4 h-3 border-r-2 border-t-2 no-print"
                style={{
                  left: `${Math.min(paperWidth - padX, padX + rightMarginPx) - 8}px`,
                  width: '8px',
                  borderColor: paperPreset.isDark
                    ? 'rgba(224, 109, 94, 0.32)'
                    : 'rgba(165, 58, 42, 0.32)',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 no-print"
                style={{
                  left: `${Math.max(12, standardPadLeft - 14)}px`,
                  width: '1px',
                  background: paperPreset.isDark
                    ? 'rgba(230, 184, 115, 0.07)'
                    : 'rgba(150, 74, 58, 0.08)',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 no-print"
                style={{
                  left: `${Math.min(paperWidth - padX, padX + rightMarginPx)}px`,
                  width: '1px',
                  borderLeft: paperPreset.isDark
                    ? '1px dashed rgba(224, 109, 94, 0.11)'
                    : '1px dashed rgba(165, 58, 42, 0.13)',
                }}
              />

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
                  letterSpacing: fontPreset.isMono ? '0.01em' : '0.005em',
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
                className={`relative z-10 block w-full resize-none bg-transparent outline-none caret-transparent select-text ${fontPreset.className}`}
                style={{
                  height: `${mirrorHeight}px`,
                  paddingTop: `${padTop}px`,
                  paddingBottom: `${padBottom}px`,
                  paddingLeft: `${standardPadLeft}px`,
                  paddingRight: `${standardPadRight}px`,
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: `${lineHeightPx}px`,
                  letterSpacing: fontPreset.isMono ? '0.01em' : '0.005em',
                  color: inkColor,
                  opacity: inkOpacity,
                  textShadow: inkTextShadow,
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
        }}
        onCreateSheet={handleCreateSheet}
        onDeleteSheet={handleDeleteSheet}
        onExportPaperPng={handleExportPaperPng}
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
        onUpdate={updateSetting}
        onApplyPatch={applySettingsPatch}
        onReset={handleResetSettings}
      />

      <OfflineIndicator />
    </div>
  );
}
