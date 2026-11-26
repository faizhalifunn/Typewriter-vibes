import React, { useMemo } from 'react';
import { PAGE_CONTENT_HEIGHT_PX } from '../constants/presets';
import type { RealismCursor, RealismStroke } from '../types';

interface OverRealismCanvasProps {
  strokes: RealismStroke[];
  cursor: RealismCursor;
  charWidth: number;
  lineHeightPx: number;
  fontSize: number;
  fontClassName: string;
  padX: number;
  padTop: number;
  padBottom: number;
  minHeight: number;
  leftMarginPx: number;
  rightMarginPx: number;
  maxPhysicalPx: number;
  isDarkPaper: boolean;
  paperBaseBg: string;
  inkColor: string;
  inkOpacity: number;
  inkTextShadow: string;
  paginationEnabled: boolean;
  showMarginBrackets?: boolean;
  onFreePositionClick: (x: number, y: number) => void;
}

export const OverRealismCanvas: React.FC<OverRealismCanvasProps> = ({
  strokes,
  cursor,
  charWidth,
  lineHeightPx,
  fontSize,
  fontClassName,
  padX,
  padTop,
  padBottom,
  minHeight,
  leftMarginPx,
  rightMarginPx,
  maxPhysicalPx,
  isDarkPaper,
  paperBaseBg,
  inkColor,
  inkOpacity,
  inkTextShadow,
  paginationEnabled,
  showMarginBrackets = true,
  onFreePositionClick,
}) => {
  const redInkColor = isDarkPaper ? '#e06d5e' : '#9c261d';
  const blueInkColor = isDarkPaper ? '#79aee8' : '#1e4478';
  const tapeFillColor = isDarkPaper ? paperBaseBg : '#faf8f3';

  const maxStrokeY = useMemo(() => {
    let maxY = cursor.y;
    for (let i = 0; i < strokes.length; i++) {
      if (strokes[i].y > maxY) maxY = strokes[i].y;
    }
    return maxY;
  }, [strokes, cursor.y]);

  const rawHeight = Math.max(
    minHeight,
    Math.ceil(padTop + maxStrokeY + lineHeightPx * 4 + padBottom)
  );
  const totalPages = paginationEnabled
    ? Math.max(1, Math.ceil(rawHeight / PAGE_CONTENT_HEIGHT_PX))
    : 1;
  const computedHeight = paginationEnabled
    ? totalPages * PAGE_CONTENT_HEIGHT_PX
    : rawHeight;

  // Raw, un-snapped analog paper positioning on click (must eyeball alignment with the Typeguide!)
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left - padX;
    const rawY = e.clientY - rect.top - padTop - lineHeightPx * 0.5;
    const clampedX = Math.max(0, Math.min(maxPhysicalPx, rawX));
    const clampedY = Math.max(0, rawY);
    onFreePositionClick(clampedX, clampedY);
  };

  return (
    <div
      role="textbox"
      aria-label="Lembar mesin ketik Over-Realism"
      aria-multiline="true"
      onClick={handleClick}
      className={`relative z-10 w-full cursor-crosshair select-none ${fontClassName}`}
      style={{
        height: `${computedHeight}px`,
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeightPx}px`,
      }}
    >
      {/* Physical Left & Right Margin Stop indicators (hidden when TabRuler already draws them) */}
      {showMarginBrackets && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-4 h-3 border-l-2 border-t-2 no-print"
            style={{
              left: `${padX + leftMarginPx}px`,
              width: '8px',
              borderColor: isDarkPaper ? 'rgba(230, 184, 115, 0.34)' : 'rgba(130, 88, 42, 0.36)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-4 h-3 border-r-2 border-t-2 no-print"
            style={{
              left: `${padX + rightMarginPx - 8}px`,
              width: '8px',
              borderColor: isDarkPaper ? 'rgba(224, 109, 94, 0.4)' : 'rgba(165, 58, 42, 0.4)',
            }}
          />
        </>
      )}

      {/* Subtle right margin boundary guide line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 bottom-0 no-print"
        style={{
          left: `${padX + rightMarginPx}px`,
          width: '1px',
          borderLeft: isDarkPaper
            ? '1px dashed rgba(224, 109, 94, 0.14)'
            : '1px dashed rgba(165, 58, 42, 0.16)',
        }}
      />

      {/* Empty sheet subtle cue */}
      {strokes.length === 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute select-none opacity-40"
          style={{
            left: `${padX + leftMarginPx}px`,
            top: `${padTop}px`,
            color: inkColor,
          }}
        >
          Mode Over-Realism — ketik langsung, pakai Ctrl+Backspace untuk pita koreksi putih...
        </div>
      )}

      {/* Free-flowing Physical Ink Impressions & Correction Tape Patches in exact strike order */}
      {strokes.map((s) => {
        if (s.color === 'correction') {
          return (
            <span
              key={s.id}
              aria-hidden="true"
              className="pointer-events-none absolute block rounded-[1.5px]"
              style={{
                left: `${padX + s.x - 1.5}px`,
                top: `${padTop + s.y + (lineHeightPx - fontSize * 1.18) * 0.45}px`,
                width: `${Math.max(10, charWidth + 3.5)}px`,
                height: `${Math.round(fontSize * 1.18)}px`,
                backgroundColor: tapeFillColor,
                opacity: 0.93,
                boxShadow: isDarkPaper
                  ? 'inset 0 0 0 0.7px rgba(255,255,255,0.08)'
                  : 'inset 0 0 0 0.7px rgba(128, 118, 104, 0.22), 0 0.5px 1px rgba(0,0,0,0.08)',
                transform: `translate(${s.jitterX.toFixed(2)}px, ${s.jitterY.toFixed(2)}px) rotate(${(s.rotation * 0.5).toFixed(2)}deg)`,
              }}
            />
          );
        }

        const strokeColor =
          s.color === 'red'
            ? redInkColor
            : s.color === 'blue'
              ? blueInkColor
              : inkColor;
        const effectiveOpacity = Math.min(1, inkOpacity * s.inkAlpha);
        const scaleY = s.scaleY ?? 1;
        const ghostShadow =
          s.ghostOffset && Math.abs(s.ghostOffset) > 0.05
            ? `${s.ghostOffset}px ${(s.ghostOffset * 0.45).toFixed(2)}px 0px ${strokeColor}44`
            : '';
        const combinedShadow = [inkTextShadow !== 'none' ? inkTextShadow : '', ghostShadow]
          .filter(Boolean)
          .join(', ');

        return (
          <span
            key={s.id}
            className="pointer-events-none absolute block whitespace-pre"
            style={{
              left: `${padX + s.x}px`,
              top: `${padTop + s.y}px`,
              color: strokeColor,
              opacity: effectiveOpacity,
              textShadow: combinedShadow || 'none',
              transform: `translate(${s.jitterX.toFixed(2)}px, ${s.jitterY.toFixed(2)}px) rotate(${s.rotation.toFixed(2)}deg) scaleY(${scaleY.toFixed(3)})`,
            }}
          >
            {s.char}
          </span>
        );
      })}
    </div>
  );
};
