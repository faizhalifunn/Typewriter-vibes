import React, { useMemo } from 'react';
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
  marginLeft: number;
  marginRight: number;
  isDarkPaper: boolean;
  inkColor: string;
  inkOpacity: number;
  inkTextShadow: string;
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
  marginLeft,
  marginRight,
  isDarkPaper,
  inkColor,
  inkOpacity,
  inkTextShadow,
  onFreePositionClick,
}) => {
  const redInkColor = isDarkPaper ? '#e06d5e' : '#9c261d';

  const maxStrokeY = useMemo(() => {
    let maxY = cursor.y;
    for (let i = 0; i < strokes.length; i++) {
      if (strokes[i].y > maxY) maxY = strokes[i].y;
    }
    return maxY;
  }, [strokes, cursor.y]);

  const computedHeight = Math.max(
    minHeight,
    Math.ceil(padTop + maxStrokeY + lineHeightPx * 4 + padBottom)
  );

  // Raw, un-snapped analog paper positioning on click (must eyeball alignment with the Typeguide!)
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left - padX;
    const rawY = e.clientY - rect.top - padTop - lineHeightPx * 0.5;
    const clampedX = Math.max(0, Math.min(84 * charWidth, rawX));
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
      {/* Physical Left & Right Margin Stop indicators */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-4 h-3 border-l-2 border-t-2 no-print"
        style={{
          left: `${padX + marginLeft * charWidth}px`,
          width: '8px',
          borderColor: isDarkPaper ? 'rgba(230, 184, 115, 0.34)' : 'rgba(130, 88, 42, 0.36)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-4 h-3 border-r-2 border-t-2 no-print"
        style={{
          left: `${padX + marginRight * charWidth - 8}px`,
          width: '8px',
          borderColor: isDarkPaper ? 'rgba(224, 109, 94, 0.4)' : 'rgba(165, 58, 42, 0.4)',
        }}
      />

      {/* Subtle right margin boundary guide line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 bottom-0 no-print"
        style={{
          left: `${padX + marginRight * charWidth}px`,
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
            left: `${padX + marginLeft * charWidth}px`,
            top: `${padTop}px`,
            color: inkColor,
          }}
        >
          Mode Over-Realism — tinta permanen, geser manual dengan panah tanpa snap otomatis...
        </div>
      )}

      {/* Free-flowing Physical Ink Impressions at exact analog coordinates */}
      {strokes.map((s) => (
        <span
          key={s.id}
          className="pointer-events-none absolute block whitespace-pre"
          style={{
            left: `${padX + s.x}px`,
            top: `${padTop + s.y}px`,
            color: s.color === 'red' ? redInkColor : inkColor,
            opacity: Math.min(1, inkOpacity * s.inkAlpha),
            textShadow: inkTextShadow,
            transform: `translate(${s.jitterX.toFixed(2)}px, ${s.jitterY.toFixed(2)}px) rotate(${s.rotation.toFixed(2)}deg)`,
          }}
        >
          {s.char}
        </span>
      ))}
    </div>
  );
};
