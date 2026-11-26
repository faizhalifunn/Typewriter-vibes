import {
  A4_ASPECT_RATIO,
  FONT_PRESETS,
  LINE_SPACING_VALUES,
  PAPER_PRESETS,
} from '../constants/presets';
import { getDeterministicStrikeMetrics } from './imperfection';
import type {
  DocumentSheet,
  EditorSettings,
  ImperfectionPresetId,
  QuoteAspectRatio,
  RealismCursor,
  RealismStroke,
  RibbonColorId,
} from '../types';

/**
 * Imprints standard text onto continuous analog RealismStrokes when switching
 * from Standard Mode into Over-Realism Mode (respecting mechanical slant & preset).
 */
export function textToRealismStrokes(
  text: string,
  leftMarginPx: number,
  rightMarginPx: number,
  charWidth: number,
  lineHeightPx: number,
  imperfectionIntensity = 52,
  imperfectionPreset: ImperfectionPresetId = 'classic_tilt',
  defaultColor: RibbonColorId = 'black'
): { strokes: RealismStroke[]; cursor: RealismCursor } {
  const strokes: RealismStroke[] = [];
  const leftPx = Math.max(0, leftMarginPx);
  const rightPx = Math.max(leftPx + Math.max(40, charWidth * 4), rightMarginPx);
  const strokeColor: RibbonColorId = defaultColor === 'correction' ? 'black' : defaultColor;

  let x = leftPx;
  let y = 0;
  let counter = 0;

  const lines = text.split('\n');
  lines.forEach((line, lineIdx) => {
    x = leftPx;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (x >= rightPx && ch !== ' ') {
        y += lineHeightPx;
        x = leftPx;
      }
      if (ch !== ' ') {
        const metrics = getDeterministicStrikeMetrics(
          counter,
          ch,
          imperfectionIntensity,
          imperfectionPreset
        );
        strokes.push({
          id: `sync-${counter++}`,
          char: ch,
          x,
          y,
          jitterX: metrics.jitterX,
          jitterY: metrics.jitterY,
          inkAlpha: metrics.inkAlpha,
          rotation: metrics.rotation,
          ghostOffset: metrics.ghostOffset,
          scaleY: metrics.scaleY,
          color: strokeColor,
        });
      }
      x += charWidth;
    }
    if (lineIdx < lines.length - 1) {
      y += lineHeightPx;
      x = leftPx;
    }
  });

  return { strokes, cursor: { x, y } };
}

/**
 * Reconstructs clean readable plain text from Over-Realism physical strokes.
 * Automatically filters out older ink strikes that were covered by a subsequent
 * white Correction Tape patch at the same position!
 */
export function realismStrokesToPlainText(
  strokes: RealismStroke[],
  charWidth: number,
  lineHeightPx: number
): string {
  if (!strokes || strokes.length === 0) return '';

  const safeCharW = Math.max(6, charWidth);
  const safeLineH = Math.max(14, lineHeightPx);

  // Filter out strokes masked by any LATER correction-tape patch at the same spot
  const visibleStrokes: RealismStroke[] = [];
  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i];
    if (s.color === 'correction') continue;

    let coveredByTape = false;
    for (let j = i + 1; j < strokes.length; j++) {
      const later = strokes[j];
      if (later.color !== 'correction') continue;
      if (
        Math.abs(later.x - s.x) <= safeCharW * 0.85 &&
        Math.abs(later.y - s.y) <= safeLineH * 0.62
      ) {
        coveredByTape = true;
        break;
      }
    }
    if (!coveredByTape) {
      visibleStrokes.push(s);
    }
  }

  if (visibleStrokes.length === 0) return '';

  // Sort top-to-bottom into visual rows, preserving empty line breaks when vertical gap > 1.5 lines
  const sorted = [...visibleStrokes].sort((a, b) => {
    const rowA = Math.round(a.y / (safeLineH * 0.65));
    const rowB = Math.round(b.y / (safeLineH * 0.65));
    if (rowA !== rowB) return rowA - rowB;
    return a.x - b.x;
  });

  const rows: { avgY: number; items: RealismStroke[] }[] = [];
  for (const s of sorted) {
    const lastRow = rows[rows.length - 1];
    if (!lastRow || Math.abs(s.y - lastRow.avgY) > safeLineH * 0.55) {
      rows.push({ avgY: s.y, items: [s] });
    } else {
      lastRow.items.push(s);
    }
  }

  const linesOut: string[] = [];
  rows.forEach((row, rowIdx) => {
    if (rowIdx > 0) {
      const prevY = rows[rowIdx - 1].avgY;
      const skippedLines = Math.max(0, Math.round((row.avgY - prevY) / safeLineH) - 1);
      for (let k = 0; k < Math.min(6, skippedLines); k++) {
        linesOut.push('');
      }
    }

    row.items.sort((a, b) => a.x - b.x);
    let line = '';
    let prevX = row.items[0].x;
    row.items.forEach((s, idx) => {
      if (idx > 0) {
        const gap = s.x - prevX;
        if (gap > safeCharW * 1.45) {
          const spaces = Math.max(1, Math.round(gap / safeCharW) - 1);
          line += ' '.repeat(Math.min(12, spaces));
        }
      }
      line += s.char;
      prevX = s.x;
    });
    linesOut.push(line.trimEnd());
  });

  return linesOut.join('\n');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function measureTextWithSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number
): number {
  if (!text) return 0;
  if (!letterSpacing) return ctx.measureText(text).width;
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
}

function drawSpacedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  startX: number,
  y: number,
  letterSpacing: number,
  align: 'left' | 'center' = 'left',
  centerX?: number
) {
  if (!letterSpacing) {
    ctx.textAlign = align === 'center' ? 'center' : 'left';
    ctx.fillText(line, align === 'center' && centerX !== undefined ? centerX : startX, y);
    return;
  }
  ctx.textAlign = 'left';
  let cursorX = startX;
  if (align === 'center' && centerX !== undefined) {
    cursorX = centerX - measureTextWithSpacing(ctx, line, letterSpacing) / 2;
  }
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    ctx.fillText(ch, cursorX, y);
    cursorX += ctx.measureText(ch).width + letterSpacing;
  }
}

function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
  letterSpacing = 0
): string[] {
  if (!paragraph) return [''];
  const words = paragraph.split(/(\s+)/);
  const lines: string[] = [];
  let current = '';

  for (const token of words) {
    const test = current + token;
    if (measureTextWithSpacing(ctx, test, letterSpacing) <= maxWidth || current === '') {
      current = test;
    } else {
      lines.push(current.replace(/\s+$/, ''));
      current = token.trimStart();
    }
  }
  lines.push(current);
  return lines;
}

async function paintPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: EditorSettings
) {
  const paperPreset = PAPER_PRESETS[settings.paperTexture] ?? PAPER_PRESETS.ivory;

  // 1. Base paper tone
  ctx.fillStyle = paperPreset.baseBg;
  ctx.fillRect(0, 0, width, height);

  // 2. Photographic paper fiber texture or modern stationery pattern
  if (paperPreset.imageUrl) {
    try {
      const img = await loadImage(paperPreset.imageUrl);
      ctx.save();
      ctx.globalAlpha = paperPreset.textureOpacity;
      if (paperPreset.imageFilter) {
        ctx.filter = paperPreset.imageFilter;
      }
      const drawW = width * 1.08;
      const drawH = (img.height / img.width) * drawW;
      const offsetX = -(drawW - width) / 2;
      for (let y = -16; y < height; y += drawH - 20) {
        ctx.drawImage(img, offsetX, y, drawW, drawH);
      }
      ctx.restore();
    } catch {
      // Base background already painted
    }
  } else if (paperPreset.pattern === 'dots') {
    ctx.save();
    ctx.fillStyle = 'rgba(72, 82, 98, 0.26)';
    for (let y = 18; y < height; y += 24) {
      for (let x = 18; x < width; x += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  } else if (paperPreset.pattern === 'grid') {
    ctx.save();
    ctx.strokeStyle = 'rgba(64, 88, 120, 0.085)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  } else if (paperPreset.pattern === 'slate') {
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.12,
      30,
      width * 0.5,
      height * 0.5,
      height * 0.8
    );
    grad.addColorStop(0, 'rgba(130, 174, 232, 0.06)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.16)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (paperPreset.isDark) {
    const grad = ctx.createRadialGradient(
      width * 0.35,
      height * 0.2,
      40,
      width * 0.5,
      height * 0.5,
      height * 0.8
    );
    grad.addColorStop(0, 'rgba(255, 244, 224, 0.045)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Vintage sepia patina, grain & photographic vignette
  const vintage = settings.vintageIntensity / 100;
  if (vintage > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = paperPreset.isDark ? 'screen' : 'multiply';
    ctx.fillStyle = paperPreset.isDark
      ? `rgba(128, 86, 38, ${(vintage * 0.14).toFixed(3)})`
      : `rgba(156, 108, 46, ${(vintage * 0.24).toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    const grainCount = Math.floor(2400 * vintage);
    ctx.fillStyle = paperPreset.isDark
      ? `rgba(255, 240, 215, ${(0.05 * vintage).toFixed(3)})`
      : `rgba(68, 46, 22, ${(0.08 * vintage).toFixed(3)})`;
    for (let i = 0; i < grainCount; i++) {
      const gx = (i * 197.3) % width;
      const gy = (i * 421.7) % height;
      ctx.fillRect(gx, gy, 1.25, 1.25);
    }
    ctx.restore();

    ctx.save();
    const vig = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.28,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(
      1,
      paperPreset.isDark
        ? `rgba(0, 0, 0, ${(vintage * 0.52).toFixed(3)})`
        : `rgba(74, 46, 18, ${(vintage * 0.4).toFixed(3)})`
    );
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function drawRubberStamp(
  ctx: CanvasRenderingContext2D,
  rightAnchorX: number,
  centerY: number,
  settings: EditorSettings,
  timestamp: number
) {
  if (!settings.stampStyle || settings.stampStyle === 'none') return;
  const paperPreset = PAPER_PRESETS[settings.paperTexture] ?? PAPER_PRESETS.ivory;

  const stampDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(timestamp || Date.now()))
    .toUpperCase();

  const isRedStamp =
    settings.stampStyle === 'date_red' || settings.stampStyle === 'archive_red';
  const isDoubleFrame =
    settings.stampStyle === 'archive_red' || settings.stampStyle === 'archive_ink';
  const customLabel = (settings.stampCustomText ?? '').trim().toUpperCase().slice(0, 28);
  const showDate = settings.stampShowDate !== false;

  const stampColor = isRedStamp
    ? paperPreset.isDark
      ? 'rgba(230, 108, 92, 0.74)'
      : 'rgba(158, 38, 30, 0.70)'
    : paperPreset.isDark
      ? 'rgba(230, 222, 208, 0.58)'
      : 'rgba(42, 36, 30, 0.56)';

  let topLine = '';
  let mainLine = '';
  if (isDoubleFrame) {
    const header = customLabel || 'ARSIP · AKSARA';
    if (showDate) {
      topLine = header;
      mainLine = stampDate;
    } else {
      mainLine = header;
    }
  } else if (customLabel && showDate) {
    topLine = customLabel;
    mainLine = stampDate;
  } else {
    mainLine = customLabel || stampDate;
  }

  ctx.save();
  ctx.font = "700 10px 'Courier Prime', monospace";
  const topW = topLine ? ctx.measureText(topLine).width + topLine.length * 1.4 : 0;
  ctx.font = "700 13px 'Special Elite', monospace";
  const mainW = mainLine ? ctx.measureText(mainLine).width + mainLine.length * 0.6 : 0;

  const boxW = Math.max(132, Math.min(264, Math.ceil(Math.max(topW, mainW) + 34)));
  const boxH = topLine ? (isDoubleFrame ? 48 : 44) : isDoubleFrame ? 38 : 32;
  const centerX = rightAnchorX - boxW / 2;

  ctx.translate(centerX, centerY);
  ctx.rotate((-4.5 * Math.PI) / 180);
  ctx.strokeStyle = stampColor;
  ctx.fillStyle = stampColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isDoubleFrame) {
    ctx.lineWidth = 2;
    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-boxW / 2 + 4, -boxH / 2 + 4, boxW - 8, boxH - 8);
  } else {
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
  }

  if (topLine) {
    ctx.font = "700 10px 'Courier Prime', monospace";
    ctx.fillText(topLine, 0, -9);
    ctx.font = "700 13px 'Special Elite', monospace";
    ctx.fillText(mainLine, 0, 9);
  } else {
    ctx.font = "700 13px 'Special Elite', monospace";
    ctx.fillText(mainLine, 0, 1);
  }

  ctx.restore();
}

function drawImperfectTextLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  startX: number,
  y: number,
  startCharIdx: number,
  baseInkColor: string,
  baseInkAlpha: number,
  intensity: number,
  preset: ImperfectionPresetId,
  align: 'left' | 'center' = 'left',
  centerX?: number,
  letterSpacing = 0
) {
  let cursorX = startX;
  if (align === 'center' && centerX !== undefined) {
    const lineW = measureTextWithSpacing(ctx, line, letterSpacing);
    cursorX = centerX - lineW / 2;
  }

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const chW = ctx.measureText(ch).width;
    if (ch !== ' ') {
      const m = getDeterministicStrikeMetrics(startCharIdx + i, ch, intensity, preset);
      ctx.save();
      ctx.translate(cursorX + m.jitterX, y + m.jitterY);
      if (m.rotation) ctx.rotate((m.rotation * Math.PI) / 180);
      if (m.scaleY !== 1) ctx.scale(1, m.scaleY);

      ctx.fillStyle = baseInkColor;
      if (m.ghostOffset) {
        ctx.globalAlpha = Math.min(1, baseInkAlpha * m.inkAlpha * 0.28);
        ctx.fillText(ch, m.ghostOffset, m.ghostOffset * 0.45);
      }
      ctx.globalAlpha = Math.min(1, baseInkAlpha * m.inkAlpha);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    cursorX += chW + letterSpacing;
  }
}

function triggerPngDownload(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/**
 * Renders the active manuscript (Standard Mode or Over-Realism free-flow strokes + correction tape)
 * into a crisp 2x high-DPI paper-styled PNG photograph with optional pagination & page numbers.
 */
export async function exportStyledPaperPng(
  sheet: DocumentSheet,
  settings: EditorSettings,
  measuredCharWidth?: number
): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const paperPreset = PAPER_PRESETS[settings.paperTexture] ?? PAPER_PRESETS.ivory;
  const fontPreset = FONT_PRESETS[settings.fontId];
  const lineHeightRatio = LINE_SPACING_VALUES[settings.lineSpacing];
  const fontSize = settings.fontSize;
  const lineHeight = Math.round(fontSize * lineHeightRatio);

  const pageWidth = 1040;
  const basePadX = 48;
  const padTop = 94;
  const padBottom = 120;
  const scale = 2;

  const scratch = document.createElement('canvas');
  const sCtx = scratch.getContext('2d');
  if (!sCtx) return;
  sCtx.font = `${fontSize}px ${fontPreset.fontFamily}`;

  const charW =
    measuredCharWidth && measuredCharWidth > 4
      ? measuredCharWidth
      : sCtx.measureText('M').width;

  const isOverRealism = settings.typingMode === 'over_realism';
  const strokes = sheet.realismStrokes ?? [];
  const letterSpacingPx = settings.letterSpacing ?? 0;

  const printableWidth = pageWidth - basePadX * 2;
  const leftMarginX = basePadX + (settings.marginLeft / 100) * printableWidth;
  const rightMarginX = Math.min(
    pageWidth - basePadX,
    basePadX + (settings.marginRight / 100) * printableWidth
  );
  const standardContentWidth = Math.max(200, rightMarginX - leftMarginX);

  let wrappedLines: string[] = [];
  let maxStrokeY = 0;
  let maxStrokeX = pageWidth - basePadX;

  if (isOverRealism) {
    for (const st of strokes) {
      if (st.y > maxStrokeY) maxStrokeY = st.y;
      if (basePadX + st.x + charW * 2 > maxStrokeX) {
        maxStrokeX = basePadX + st.x + charW * 2;
      }
    }
  } else {
    const paragraphs = sheet.content.split('\n');
    for (const p of paragraphs) {
      wrappedLines.push(...wrapParagraph(sCtx, p, standardContentWidth, letterSpacingPx));
    }
  }

  const finalPageWidth = Math.max(pageWidth, Math.ceil(maxStrokeX + basePadX));
  const a4PageHeight = Math.round(finalPageWidth * A4_ASPECT_RATIO);
  const rawContentHeight = isOverRealism
    ? Math.max(lineHeight * 12, maxStrokeY + lineHeight * 2)
    : Math.max(lineHeight * 12, wrappedLines.length * lineHeight);
  const rawHeight = Math.max(
    settings.paginationEnabled ? a4PageHeight : 1160,
    Math.ceil(padTop + rawContentHeight + padBottom)
  );
  const totalPages = settings.paginationEnabled
    ? Math.max(1, Math.ceil(rawHeight / a4PageHeight))
    : 1;
  const pageHeight = settings.paginationEnabled ? totalPages * a4PageHeight : rawHeight;

  const canvas = document.createElement('canvas');
  canvas.width = finalPageWidth * scale;
  canvas.height = pageHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  await paintPaperBackground(ctx, finalPageWidth, pageHeight, settings);

  // Subtle stationery left margin hairline
  ctx.save();
  ctx.fillStyle = paperPreset.isDark
    ? 'rgba(230, 184, 115, 0.08)'
    : paperPreset.category === 'modern'
      ? 'rgba(64, 88, 120, 0.1)'
      : 'rgba(150, 74, 58, 0.09)';
  ctx.fillRect(Math.max(24, leftMarginX - 20), 0, 1, pageHeight);
  ctx.restore();

  // Vintage rubber date / custom stamp (anchored cleanly to right margin edge)
  drawRubberStamp(ctx, finalPageWidth - basePadX, 56, settings, sheet.updatedAt);

  // Render typed text / Over-Realism strokes + correction tape patches
  const baseInkColor =
    settings.inkWear === 'faded' ? paperPreset.inkFadedColor : paperPreset.inkColor;
  const redInkColor = paperPreset.isDark ? '#e06d5e' : '#9c261d';
  const blueInkColor = paperPreset.isDark ? '#79aee8' : '#1e4478';
  const standardInkColor =
    settings.ribbonColor === 'red'
      ? redInkColor
      : settings.ribbonColor === 'blue'
        ? blueInkColor
        : baseInkColor;
  const tapeColor = paperPreset.isDark ? paperPreset.baseBg : '#faf9f5';
  const baseInkAlpha =
    settings.inkWear === 'fresh' ? 0.96 : settings.inkWear === 'classic' ? 0.89 : 0.74;
  const vintage = settings.vintageIntensity / 100;

  ctx.save();
  ctx.font = `${fontSize}px ${fontPreset.fontFamily}`;
  ctx.textBaseline = 'top';

  if (vintage > 0.15) {
    ctx.shadowColor = paperPreset.isDark
      ? `rgba(235, 224, 200, ${(vintage * 0.22).toFixed(2)})`
      : `rgba(34, 24, 14, ${(vintage * 0.28).toFixed(2)})`;
    ctx.shadowBlur = vintage * 1.1;
  }

  if (isOverRealism) {
    for (const stroke of strokes) {
      const drawX = basePadX + stroke.x + stroke.jitterX;
      const drawY = padTop + stroke.y + (lineHeight - fontSize) * 0.25 + stroke.jitterY;
      ctx.save();
      ctx.translate(drawX, drawY);
      if (stroke.rotation) {
        ctx.rotate((stroke.rotation * Math.PI) / 180);
      }

      if (stroke.color === 'correction') {
        ctx.shadowBlur = 0;
        ctx.fillStyle = tapeColor;
        ctx.globalAlpha = 0.93;
        ctx.fillRect(-1.5, -2, charW + 3.5, fontSize * 1.15);
        ctx.strokeStyle = paperPreset.isDark
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(120, 112, 98, 0.16)';
        ctx.lineWidth = 0.7;
        ctx.strokeRect(-1.5, -2, charW + 3.5, fontSize * 1.15);
      } else {
        if (stroke.scaleY && stroke.scaleY !== 1) {
          ctx.scale(1, stroke.scaleY);
        }
        ctx.fillStyle =
          stroke.color === 'red'
            ? redInkColor
            : stroke.color === 'blue'
              ? blueInkColor
              : baseInkColor;
        if (stroke.ghostOffset) {
          ctx.globalAlpha = Math.min(1, baseInkAlpha * stroke.inkAlpha * 0.26);
          ctx.fillText(stroke.char, stroke.ghostOffset, stroke.ghostOffset * 0.45);
        }
        ctx.globalAlpha = Math.min(1, baseInkAlpha * stroke.inkAlpha);
        ctx.fillText(stroke.char, 0, 0);
      }
      ctx.restore();
    }
  } else {
    // Preserve physical white correction-tape patches stamped in Over-Realism Mode underneath Standard Mode text
    const tapePatches = strokes.filter((st) => st.color === 'correction');
    for (const tape of tapePatches) {
      const drawX = basePadX + tape.x + tape.jitterX;
      const drawY = padTop + tape.y + (lineHeight - fontSize) * 0.25 + tape.jitterY;
      ctx.save();
      ctx.translate(drawX, drawY);
      if (tape.rotation) {
        ctx.rotate((tape.rotation * Math.PI) / 180);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = tapeColor;
      ctx.globalAlpha = 0.93;
      ctx.fillRect(-1.5, -2, charW + 3.5, fontSize * 1.15);
      ctx.strokeStyle = paperPreset.isDark
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(120, 112, 98, 0.16)';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-1.5, -2, charW + 3.5, fontSize * 1.15);
      ctx.restore();
    }

    let charCounter = 0;
    const useImperfectStandard =
      settings.imperfectionInStandard && settings.imperfectionIntensity > 0;
    wrappedLines.forEach((line, idx) => {
      const y = padTop + idx * lineHeight + (lineHeight - fontSize) * 0.25;
      if (useImperfectStandard) {
        drawImperfectTextLine(
          ctx,
          line,
          leftMarginX,
          y,
          charCounter,
          standardInkColor,
          baseInkAlpha,
          settings.imperfectionIntensity,
          settings.imperfectionPreset,
          'left',
          undefined,
          letterSpacingPx
        );
      } else {
        ctx.fillStyle = standardInkColor;
        ctx.globalAlpha = baseInkAlpha;
        drawSpacedLine(ctx, line, leftMarginX, y, letterSpacingPx, 'left');
      }
      charCounter += line.length + 1;
    });
  }
  ctx.restore();

  // Render crisp A4 page dividers & centered page numbers when Pagination is ON
  if (settings.paginationEnabled) {
    ctx.save();
    for (let p = 1; p <= totalPages; p++) {
      const pageBottomY = p * a4PageHeight;
      ctx.font = `500 12px ${fontPreset.fontFamily}`;
      ctx.fillStyle = baseInkColor;
      ctx.globalAlpha = 0.48;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`— ${p} —`, finalPageWidth / 2, pageBottomY - 34);

      if (p < totalPages) {
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = baseInkColor;
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(42, pageBottomY);
        ctx.lineTo(finalPageWidth - 42, pageBottomY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  const safeName = (sheet.title.trim() || 'aksara-naskah')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '-');
  await triggerPngDownload(canvas, `${safeName}.png`);
}

export interface QuoteCardExportOptions {
  quoteText: string;
  attribution: string;
  ratio: QuoteAspectRatio;
  align: 'left' | 'center';
  showStamp: boolean;
  timestamp: number;
  settings: EditorSettings;
}

/**
 * Exports an editorial high-DPI Quote Card PNG (1:1, 4:5, or 9:16) inheriting the
 * active paper texture, typography, vintage warmth, rubber stamp, and mechanical tilt.
 */
export async function exportQuoteCardPng(opts: QuoteCardExportOptions): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const dims: Record<QuoteAspectRatio, { w: number; h: number }> = {
    '1:1': { w: 1080, h: 1080 },
    '4:5': { w: 1080, h: 1350 },
    '9:16': { w: 1080, h: 1920 },
  };
  const { w, h } = dims[opts.ratio];
  const scale = 2;

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  const paperPreset = PAPER_PRESETS[opts.settings.paperTexture] ?? PAPER_PRESETS.ivory;
  const fontPreset = FONT_PRESETS[opts.settings.fontId];

  await paintPaperBackground(ctx, w, h, opts.settings);

  // Subtle framed editorial border
  const frameInset = 56;
  ctx.save();
  ctx.strokeStyle = paperPreset.isDark
    ? 'rgba(235, 224, 200, 0.12)'
    : 'rgba(34, 28, 22, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(frameInset, frameInset, w - frameInset * 2, h - frameInset * 2);
  ctx.restore();

  if (opts.showStamp && opts.settings.stampStyle !== 'none') {
    drawRubberStamp(ctx, w - frameInset - 28, frameInset + 64, opts.settings, opts.timestamp);
  }

  // Adaptive font sizing so short quotes feel bold & editorial, longer quotes stay airy
  const cleanQuote = opts.quoteText.trim() || 'Tuliskan kutipan terbaikmu di sini.';
  const len = cleanQuote.length;
  const baseFontSize =
    len < 80 ? 44 : len < 160 ? 36 : len < 280 ? 30 : 25;
  const lineHeight = Math.round(baseFontSize * 1.65);
  const padX = 128;
  const maxTextW = w - padX * 2;

  const baseInkColor =
    opts.settings.ribbonColor === 'red'
      ? paperPreset.isDark
        ? '#e06d5e'
        : '#9c261d'
      : opts.settings.ribbonColor === 'blue'
        ? paperPreset.isDark
          ? '#79aee8'
          : '#1e4478'
        : opts.settings.inkWear === 'faded'
          ? paperPreset.inkFadedColor
          : paperPreset.inkColor;
  const baseInkAlpha =
    opts.settings.inkWear === 'fresh' ? 0.96 : opts.settings.inkWear === 'classic' ? 0.9 : 0.78;
  const quoteLetterSpacing = (opts.settings.letterSpacing ?? 0) * (baseFontSize / 19);

  ctx.save();
  ctx.font = `${baseFontSize}px ${fontPreset.fontFamily}`;
  ctx.textBaseline = 'top';

  const wrapped: string[] = [];
  cleanQuote.split('\n').forEach((p) => {
    wrapped.push(...wrapParagraph(ctx, p, maxTextW, quoteLetterSpacing));
  });

  const maxLines = Math.floor((h - 380) / lineHeight);
  const clippedLines = wrapped.slice(0, Math.max(1, maxLines));
  const blockH = clippedLines.length * lineHeight;
  const startY = Math.round((h - blockH) / 2 - (opts.attribution.trim() ? 24 : 0));

  // Decorative opening quotation mark
  ctx.save();
  ctx.font = `600 84px 'Cormorant Garamond', Georgia, serif`;
  ctx.fillStyle = baseInkColor;
  ctx.globalAlpha = 0.24;
  ctx.textAlign = opts.align === 'center' ? 'center' : 'left';
  ctx.fillText('“', opts.align === 'center' ? w / 2 : padX - 8, startY - 68);
  ctx.restore();

  const useTilt = opts.settings.imperfectionIntensity > 0;
  let idxCounter = 0;
  clippedLines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    if (useTilt) {
      drawImperfectTextLine(
        ctx,
        line,
        padX,
        y,
        idxCounter,
        baseInkColor,
        baseInkAlpha,
        opts.settings.imperfectionIntensity,
        opts.settings.imperfectionPreset,
        opts.align,
        w / 2,
        quoteLetterSpacing
      );
    } else {
      ctx.fillStyle = baseInkColor;
      ctx.globalAlpha = baseInkAlpha;
      drawSpacedLine(ctx, line, padX, y, quoteLetterSpacing, opts.align, w / 2);
    }
    idxCounter += line.length + 1;
  });

  // Attribution & subtle brand footer
  if (opts.attribution.trim()) {
    ctx.save();
    ctx.font = `500 22px ${fontPreset.fontFamily}`;
    ctx.fillStyle = baseInkColor;
    ctx.globalAlpha = 0.62;
    ctx.textAlign = opts.align === 'center' ? 'center' : 'left';
    ctx.fillText(
      `— ${opts.attribution.trim()}`,
      opts.align === 'center' ? w / 2 : padX,
      startY + blockH + 34
    );
    ctx.restore();
  }

  ctx.save();
  ctx.font = `600 24px 'Cormorant Garamond', Georgia, serif`;
  ctx.fillStyle = baseInkColor;
  ctx.globalAlpha = 0.34;
  ctx.textAlign = 'center';
  ctx.fillText('Aksara', w / 2, h - frameInset - 44);
  ctx.restore();

  ctx.restore();

  const slug = opts.ratio.replace(':', 'x');
  await triggerPngDownload(canvas, `aksara-kutipan-${slug}.png`);
}
