import React, { useRef, useState } from 'react';

interface TabRulerProps {
  padX: number;
  printableWidth: number;
  marginLeft: number;
  marginRight: number;
  tabStops: number[];
  stageHeight: number;
  isDarkPaper: boolean;
  onToggleTabStop: (percent: number) => void;
  onChangeMarginLeft: (percent: number) => void;
  onChangeMarginRight: (percent: number) => void;
}

const MIN_WRITING_SPAN = 12;

export const TabRuler: React.FC<TabRulerProps> = ({
  padX,
  printableWidth,
  marginLeft,
  marginRight,
  tabStops,
  stageHeight,
  isDarkPaper,
  onToggleTabStop,
  onChangeMarginLeft,
  onChangeMarginRight,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [draggingEdge, setDraggingEdge] = useState<'left' | 'right' | null>(null);

  const isInteracting = hoverPct !== null || draggingEdge !== null;

  const findNearbyPin = (pct: number): number | null => {
    for (const stop of tabStops) {
      if (Math.abs(stop - pct) <= 2.0) return stop;
    }
    return null;
  };

  const clientXToPct = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const rel = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    return Math.max(0, Math.min(100, rel));
  };

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingEdge) return;
    const pct = clientXToPct(e.clientX);
    const snapped = Math.round(Math.max(2, Math.min(98, pct)) / 2) * 2;
    setHoverPct(snapped);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (draggingEdge) return;
    const rawPct = clientXToPct(e.clientX);
    const nearby = findNearbyPin(rawPct);
    if (nearby !== null) {
      onToggleTabStop(nearby);
      return;
    }
    const snapped = Math.round(Math.max(2, Math.min(98, rawPct)) / 2) * 2;
    if (snapped >= marginLeft + 2 && snapped <= marginRight - 2) {
      onToggleTabStop(snapped);
    }
  };

  const startMarginDrag = (edge: 'left' | 'right') => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingEdge(edge);
  };

  const handleMarginDragMove = (edge: 'left' | 'right') => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (draggingEdge !== edge) return;
    e.stopPropagation();
    const rawPct = Math.round(clientXToPct(e.clientX));
    if (edge === 'left') {
      const clamped = Math.max(0, Math.min(45, Math.min(marginRight - MIN_WRITING_SPAN, rawPct)));
      if (clamped !== marginLeft) onChangeMarginLeft(clamped);
    } else {
      const clamped = Math.min(100, Math.max(55, Math.max(marginLeft + MIN_WRITING_SPAN, rawPct)));
      if (clamped !== marginRight) onChangeMarginRight(clamped);
    }
  };

  const endMarginDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingEdge) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
    setDraggingEdge(null);
  };

  const tickColor = isDarkPaper ? 'rgba(235, 224, 200, 0.22)' : 'rgba(62, 52, 40, 0.22)';
  const majorTickColor = isDarkPaper ? 'rgba(235, 224, 200, 0.36)' : 'rgba(62, 52, 40, 0.36)';
  const ruleLineColor = isDarkPaper ? 'rgba(235, 224, 200, 0.14)' : 'rgba(62, 52, 40, 0.15)';
  const pinColor = isDarkPaper ? '#e6b873' : '#a96c23';
  const marginLeftColor = isDarkPaper ? 'rgba(230, 184, 115, 0.85)' : 'rgba(130, 88, 42, 0.85)';
  const marginRightColor = isDarkPaper ? 'rgba(224, 109, 94, 0.88)' : 'rgba(165, 58, 42, 0.88)';
  const guideThreadColor = isDarkPaper ? 'rgba(230, 184, 115, 0.16)' : 'rgba(169, 108, 35, 0.18)';
  const marginGuideLineColor = isDarkPaper ? 'rgba(230, 184, 115, 0.24)' : 'rgba(130, 88, 42, 0.24)';

  const hoveredExisting = hoverPct !== null && !draggingEdge ? findNearbyPin(hoverPct) : null;
  const hoverValidNew =
    hoverPct !== null &&
    !draggingEdge &&
    hoveredExisting === null &&
    hoverPct >= marginLeft + 2 &&
    hoverPct <= marginRight - 2;

  return (
    <div
      className={`absolute top-2.5 z-20 select-none no-print transition-opacity duration-200 ${
        isInteracting ? 'opacity-100' : 'opacity-35 hover:opacity-100'
      }`}
      style={{
        left: `${padX}px`,
        width: `${printableWidth}px`,
      }}
    >
      {/* Interactive Ruler Track */}
      <div
        ref={trackRef}
        role="group"
        aria-label="Penggaris margin dan tabulasi — seret ujung untuk atur margin, klik untuk pasang atau hapus pin Tab"
        onMouseMove={handleTrackMouseMove}
        onMouseLeave={() => setHoverPct(null)}
        onClick={handleTrackClick}
        className="relative h-7 cursor-crosshair"
      >
        {/* Subtle horizontal ruler baseline */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 bottom-1.5 h-px"
          style={{ backgroundColor: ruleLineColor }}
        />

        {/* Tick marks every 5% (taller at every 10%) */}
        {Array.from({ length: 21 }).map((_, idx) => {
          const pct = idx * 5;
          const isMajor = pct % 10 === 0;
          return (
            <div
              key={pct}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1.5"
              style={{
                left: `${pct}%`,
                width: '1px',
                height: isMajor ? '7px' : '4px',
                backgroundColor: isMajor ? majorTickColor : tickColor,
              }}
            >
              {isMajor && pct > 0 && pct < 100 && isInteracting && (
                <span
                  className="absolute -top-3.5 -translate-x-1/2 font-mono text-[8.5px] tabular-nums"
                  style={{
                    color: isDarkPaper ? 'rgba(235, 224, 200, 0.48)' : 'rgba(62, 52, 40, 0.48)',
                  }}
                >
                  {pct}
                </span>
              )}
            </div>
          );
        })}

        {/* Draggable Left Margin Stop Handle */}
        <button
          type="button"
          onPointerDown={startMarginDrag('left')}
          onPointerMove={handleMarginDragMove('left')}
          onPointerUp={endMarginDrag}
          onPointerCancel={endMarginDrag}
          onClick={(e) => e.stopPropagation()}
          title={`Seret untuk geser Margin Kiri (${marginLeft}%)`}
          aria-label={`Geser Margin Kiri (${marginLeft}%)`}
          className="absolute bottom-0 -translate-x-1/2 z-20 flex h-6 w-5 items-end justify-center cursor-ew-resize touch-none group"
          style={{ left: `${marginLeft}%` }}
        >
          <span
            className="block h-3.5 w-2 border-l-2 border-t-2 transition-transform group-hover:scale-110"
            style={{
              marginLeft: '4px',
              borderColor: marginLeftColor,
            }}
          />
        </button>

        {/* Draggable Right Margin Stop Handle */}
        <button
          type="button"
          onPointerDown={startMarginDrag('right')}
          onPointerMove={handleMarginDragMove('right')}
          onPointerUp={endMarginDrag}
          onPointerCancel={endMarginDrag}
          onClick={(e) => e.stopPropagation()}
          title={`Seret untuk geser Margin Kanan (${marginRight}%)`}
          aria-label={`Geser Margin Kanan (${marginRight}%)`}
          className="absolute bottom-0 -translate-x-1/2 z-20 flex h-6 w-5 items-end justify-center cursor-ew-resize touch-none group"
          style={{ left: `${marginRight}%` }}
        >
          <span
            className="block h-3.5 w-2 border-r-2 border-t-2 transition-transform group-hover:scale-110"
            style={{
              marginRight: '4px',
              borderColor: marginRightColor,
            }}
          />
        </button>

        {/* Custom Tab Stop Brass Pins */}
        {tabStops.map((stop) => {
          const isTargetRemove = hoveredExisting === stop;
          return (
            <div
              key={stop}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 -translate-x-1/2 flex flex-col items-center transition-transform duration-100"
              style={{
                left: `${stop}%`,
                transform: `translateX(-50%) scale(${isTargetRemove ? 1.25 : 1})`,
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '4.5px solid transparent',
                  borderRight: '4.5px solid transparent',
                  borderTop: `6.5px solid ${isTargetRemove ? '#e06d5e' : pinColor}`,
                }}
              />
            </div>
          );
        })}

        {/* Ghost preview pin on hover */}
        {hoverValidNew && hoverPct !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 -translate-x-1/2 opacity-55"
            style={{ left: `${hoverPct}%` }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: `6px solid ${pinColor}`,
              }}
            />
          </div>
        )}

        {/* Quiet inline micro-status label ONLY while hovering or dragging */}
        {isInteracting && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 right-0 font-mono text-[9.5px] tabular-nums tracking-tight"
            style={{
              color: isDarkPaper ? 'rgba(235, 224, 200, 0.65)' : 'rgba(62, 52, 40, 0.65)',
            }}
          >
            {draggingEdge === 'left'
              ? `Margin Kiri ${marginLeft}% · Lebar ${marginRight - marginLeft}%`
              : draggingEdge === 'right'
                ? `Margin Kanan ${marginRight}% · Lebar ${marginRight - marginLeft}%`
                : hoveredExisting !== null
                  ? `Klik untuk hapus Tab ${hoveredExisting}%`
                  : hoverValidNew
                    ? `Klik pasang Tab ${hoverPct}% · Seret ujung atur margin`
                    : 'Seret tanda siku untuk atur margin'}
          </div>
        )}
      </div>

      {/* Live full-height margin alignment threads ONLY while dragging or hovering ruler */}
      {isInteracting && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-7"
            style={{
              left: `${marginLeft}%`,
              height: `${Math.max(400, stageHeight - 36)}px`,
              width: '1px',
              borderLeft: `1px dashed ${marginGuideLineColor}`,
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-7"
            style={{
              left: `${marginRight}%`,
              height: `${Math.max(400, stageHeight - 36)}px`,
              width: '1px',
              borderLeft: `1px dashed ${
                isDarkPaper ? 'rgba(224, 109, 94, 0.28)' : 'rgba(165, 58, 42, 0.28)'
              }`,
            }}
          />
          {!draggingEdge &&
            tabStops.map((stop) => (
              <div
                key={`thread-${stop}`}
                aria-hidden="true"
                className="pointer-events-none absolute top-7"
                style={{
                  left: `${stop}%`,
                  height: `${Math.max(400, stageHeight - 36)}px`,
                  width: '1px',
                  borderLeft: `1px dashed ${guideThreadColor}`,
                }}
              />
            ))}
        </>
      )}
    </div>
  );
};
