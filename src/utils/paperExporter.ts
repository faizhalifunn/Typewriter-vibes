import { FONT_PRESETS, LINE_SPACING_VALUES, PAPER_PRESETS } from '../constants/presets';
import type { DocumentSheet, EditorSettings, RealismCursor, RealismStroke } from '../types';

/**
 * Imprints existing standard text onto continuous analog RealismStrokes
 * when entering Over-Realism mode on a document for the first time.
 */
export function textToRealismStrokes(
  text: string,
  marginLeftCols: number,
  marginRightCols: number,
  charWidth: number,
  lineHeightPx: number
): { strokes: RealismStroke[]; cursor: RealismCursor } {
  const strokes: RealismStroke[] = [];
  const leftPx = marginLeftCols * charWidth;
  const rightPx = marginRightCols * charWidth;

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
        const seed = (Math.round(y) * 13 + Math.round(x) * 7 + ch.charCodeAt(0) + counter) % 100;
        strokes.push({
          id: `init-${counter++}`,
          char: ch,
          x,
          y,
          jitterX: ((seed % 7) - 3) * 0.14,
          jitterY: (((seed * 3) % 9) - 4) * 0.18,
          inkAlpha: 0.82 + (seed % 18) / 100,
          rotation: (((seed * 5) % 9) - 4) * 0.14,
          color: 'black',
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
 * Reconstructs readable plain text from free-flow Over-Realism strokes
 * (grouping nearby vertical strokes into lines sorted left-to-right) for .txt export & stats.
 */
export function realismStrokesToPlainText(
  strokes: RealismStroke[],
  charWidth: number,
  lineHeightPx: number
): string {
  if (!strokes || strokes.length === 0) return '';

  const safeCharW = Math.max(6, charWidth);
  const safeLineH = Math.max(14, lineHeightPx);

  // Group strokes into approximate visual lines
  const sorted = [...strokes].sort((a, b) => {
    const rowA = Math.round(a.y / (safeLineH * 0.65));
    const rowB = Math.round(b.y / (safeLineH * 0.65));
    if (rowA !== rowB) return rowA - rowB;
    return a.x - b.x;
  });

  const rows: RealismStroke[][] = [];
  for (const s of sorted) {
    const lastRow = rows[rows.length - 1];
    if (!lastRow || Math.abs(s.y - lastRow[0].y) > safeLineH * 0.55) {
      rows.push([s]);
    } else {
      lastRow.push(s);
    }
  }

  return rows
    .map((row) => {
      row.sort((a, b) => a.x - b.x);
      let line = '';
      let prevX = row[0].x;
      row.forEach((s, idx) => {
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
      return line.trimEnd();
    })
    .join('\n');
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

function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number
): string[] {
  if (!paragraph) return [''];
  const words = paragraph.split(/(\s+)/);
  const lines: string[] = [];
  let current = '';

  for (const token of words) {
    const test = current + token;
    if (ctx.measureText(test).width <= maxWidth || current === '') {
      current = test;
    } else {
      lines.push(current.replace(/\s+$/, ''));
      current = token.trimStart();
    }
  }
  lines.push(current);
  return lines;
}

/**
 * Renders the active manuscript (both Standard mode and Over-Realism free-flow strokes)
 * into a crisp 2x high-DPI paper-styled PNG photograph with paper texture, vintage patina,
 * margins, ink wear, and bichrome ribbon color.
 */
export async function exportStyledPaperPng(
  sheet: DocumentSheet,
  settings: EditorSettings,
  measuredCharWidth?: number
): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const paperPreset = PAPER_PRESETS[settings.paperTexture];
  const fontPreset = FONT_PRESETS[settings.fontId];
  const lineHeightRatio = LINE_SPACING_VALUES[settings.lineSpacing];
  const fontSize = settings.fontSize;
  const lineHeight = Math.round(fontSize * lineHeightRatio);

  const pageWidth = 880;
  const basePadX = 68;
  const padTop = 94;
  const padBottom = 120;
  const scale = 2; // 2x Retina photograph resolution

  const scratch = document.createElement('canvas');
  const sCtx = scratch.getContext('2d');
  if (!sCtx) return;
  sCtx.font = `${fontSize}px ${fontPreset.fontFamily}`;

  const charW = measuredCharWidth && measuredCharWidth > 4
    ? measuredCharWidth
    : sCtx.measureText('M').width;

  const isOverRealism = settings.typingMode === 'over_realism';
  const strokes = sheet.realismStrokes ?? [];

  // Respect user's Left & Right Margin settings in Standard mode too!
  const leftMarginX = basePadX + settings.marginLeft * charW;
  const rightMarginX = Math.min(pageWidth - basePadX, basePadX + settings.marginRight * charW);
  const standardContentWidth = Math.max(220, rightMarginX - leftMarginX);

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
      wrappedLines.push(...wrapParagraph(sCtx, p, standardContentWidth));
    }
  }

  const finalPageWidth = Math.max(pageWidth, Math.ceil(maxStrokeX + basePadX));
  const contentHeight = isOverRealism
    ? Math.max(lineHeight * 12, maxStrokeY + lineHeight * 2)
    : Math.max(lineHeight * 12, wrappedLines.length * lineHeight);
  const pageHeight = Math.max(1160, Math.ceil(padTop + contentHeight + padBottom));

  const canvas = document.createElement('canvas');
  canvas.width = finalPageWidth * scale;
  canvas.height = pageHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  // 1. Base paper tone
  ctx.fillStyle = paperPreset.baseBg;
  ctx.fillRect(0, 0, finalPageWidth, pageHeight);

  // 2. Photographic paper fiber texture
  if (paperPreset.imageUrl) {
    try {
      const img = await loadImage(paperPreset.imageUrl);
      ctx.save();
      ctx.globalAlpha = paperPreset.textureOpacity;
      if (paperPreset.imageFilter) {
        ctx.filter = paperPreset.imageFilter;
      }
      const drawW = finalPageWidth * 1.08;
      const drawH = (img.height / img.width) * drawW;
      const offsetX = -(drawW - finalPageWidth) / 2;
      for (let y = -16; y < pageHeight; y += drawH - 20) {
        ctx.drawImage(img, offsetX, y, drawW, drawH);
      }
      ctx.restore();
    } catch {
      // Fallback already filled with baseBg
    }
  } else if (paperPreset.isDark) {
    const grad = ctx.createRadialGradient(
      finalPageWidth * 0.35,
      pageHeight * 0.2,
      40,
      finalPageWidth * 0.5,
      pageHeight * 0.5,
      pageHeight * 0.8
    );
    grad.addColorStop(0, 'rgba(255, 244, 224, 0.045)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, finalPageWidth, pageHeight);
  }

  // 3. Vintage sepia patina, paper grain & natural photographic vignette
  const vintage = settings.vintageIntensity / 100;
  if (vintage > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = paperPreset.isDark ? 'screen' : 'multiply';
    ctx.fillStyle = paperPreset.isDark
      ? `rgba(128, 86, 38, ${(vintage * 0.14).toFixed(3)})`
      : `rgba(156, 108, 46, ${(vintage * 0.24).toFixed(3)})`;
    ctx.fillRect(0, 0, finalPageWidth, pageHeight);
    ctx.restore();

    ctx.save();
    const grainCount = Math.floor(2800 * vintage);
    ctx.fillStyle = paperPreset.isDark
      ? `rgba(255, 240, 215, ${(0.05 * vintage).toFixed(3)})`
      : `rgba(68, 46, 22, ${(0.08 * vintage).toFixed(3)})`;
    for (let i = 0; i < grainCount; i++) {
      const gx = (i * 197.3) % finalPageWidth;
      const gy = (i * 421.7) % pageHeight;
      ctx.fillRect(gx, gy, 1.25, 1.25);
    }
    ctx.restore();

    ctx.save();
    const vig = ctx.createRadialGradient(
      finalPageWidth / 2,
      pageHeight / 2,
      finalPageWidth * 0.28,
      finalPageWidth / 2,
      pageHeight / 2,
      Math.max(finalPageWidth, pageHeight) * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(
      1,
      paperPreset.isDark
        ? `rgba(0, 0, 0, ${(vintage * 0.52).toFixed(3)})`
        : `rgba(74, 46, 18, ${(vintage * 0.4).toFixed(3)})`
    );
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, finalPageWidth, pageHeight);
    ctx.restore();
  }

  // 4. Subtle stationery left margin hairline
  ctx.save();
  ctx.fillStyle = paperPreset.isDark
    ? 'rgba(230, 184, 115, 0.08)'
    : 'rgba(150, 74, 58, 0.09)';
  ctx.fillRect(Math.max(24, leftMarginX - 20), 0, 1, pageHeight);
  ctx.restore();

  // 4b. Vintage Rubber Date Stamp (if enabled)
  if (settings.stampStyle && settings.stampStyle !== 'none') {
    const stampDate = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
      .format(new Date(sheet.updatedAt || Date.now()))
      .toUpperCase();

    const isRedStamp = settings.stampStyle !== 'date_ink';
    const stampColor = isRedStamp
      ? paperPreset.isDark
        ? 'rgba(230, 108, 92, 0.72)'
        : 'rgba(158, 38, 30, 0.68)'
      : paperPreset.isDark
        ? 'rgba(230, 222, 208, 0.56)'
        : 'rgba(42, 36, 30, 0.54)';

    ctx.save();
    ctx.translate(finalPageWidth - basePadX - 78, 56);
    ctx.rotate((-4.5 * Math.PI) / 180);
    ctx.strokeStyle = stampColor;
    ctx.fillStyle = stampColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (settings.stampStyle === 'archive_red') {
      // Double-bordered archival rectangular stamp
      ctx.lineWidth = 2;
      ctx.strokeRect(-72, -24, 144, 48);
      ctx.lineWidth = 0.9;
      ctx.strokeRect(-68, -20, 136, 40);
      ctx.font = "700 10px 'Courier Prime', monospace";
      ctx.fillText('ARSIP · AKSARA', 0, -8);
      ctx.font = "700 13px 'Special Elite', monospace";
      ctx.fillText(stampDate, 0, 9);
    } else {
      // Classic rectangular rubber date stamp
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-66, -16, 132, 32);
      ctx.font = "700 13px 'Special Elite', monospace";
      ctx.fillText(stampDate, 0, 1);
    }
    ctx.restore();
  }

  // 5. Render typed text / continuous analog Over-Realism strokes
  const baseInkColor =
    settings.inkWear === 'faded' ? paperPreset.inkFadedColor : paperPreset.inkColor;
  const redInkColor = paperPreset.isDark ? '#e06d5e' : '#9c261d';
  const baseInkAlpha =
    settings.inkWear === 'fresh' ? 0.96 : settings.inkWear === 'classic' ? 0.89 : 0.74;

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
      ctx.fillStyle = stroke.color === 'red' ? redInkColor : baseInkColor;
      ctx.globalAlpha = Math.min(1, baseInkAlpha * stroke.inkAlpha);
      ctx.fillText(stroke.char, 0, 0);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = baseInkColor;
    ctx.globalAlpha = baseInkAlpha;
    wrappedLines.forEach((line, idx) => {
      const y = padTop + idx * lineHeight + (lineHeight - fontSize) * 0.25;
      ctx.fillText(line, leftMarginX, y);
    });
  }
  ctx.restore();

  const safeName = (sheet.title.trim() || 'aksara-naskah')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '-');

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
