import React, { useState } from 'react';

interface TabRulerProps {
  padX: number;
  printableWidth: number;
  marginLeft: number;
  marginRight: number;
  tabStops: number[];
  stageHeight: number;
  isDarkPaper: boolean;
  onToggleTabStop: (percent: number) => void;
}

export const TabRuler: React.FC<TabRulerProps> = ({
  padX,
  printableWidth,
  marginLeft,
  marginRight,
  tabStops,
  stageHeight,
  isDarkPaper,
  onToggleTabStop,
}) => {
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const findNearbyPin = (pct: number): number | null => {
    for (const stop of tabStops) {
      if (Math.abs(stop - pct) <= 2.4) return stop;
    }
    return null;
  };

  const computeSnappedPct = (e: React.MouseEvent<HTMLDivElement>): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    const clamped = Math.max(2, Math.min(98, rel));
    return Math.round(clamped / 2) * 2;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setHoverPct(computeSnappedPct(e));
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rawRect = e.currentTarget.getBoundingClientRect();
    const rawPct = ((e.clientX - rawRect.left) / Math.max(1, rawRect.width)) * 100;
    const nearby = findNearbyPin(rawPct);
    if (nearby !== null) {
      onToggleTabStop(nearby);
      return;
    }
    const snapped = computeSnappedPct(e);
    if (snapped >= marginLeft + 2 && snapped <= marginRight - 2) {
      onToggleTabStop(snapped);
    }
  };

  const tickColor = isDarkPaper ? 'rgba(235, 224, 200, 0.22)' : 'rgba(62, 52, 40, 0.22)';
  const majorTickColor = isDarkPaper ? 'rgba(235, 224, 200, 0.36)' : 'rgba(62, 52, 40, 0.36)';
  const ruleLineColor = isDarkPaper ? 'rgba(235, 224, 200, 0.14)' : 'rgba(62, 52, 40, 0.15)';
  const pinColor = isDarkPaper ? '#e6b873' : '#a96c23';
  const marginLeftColor = isDarkPaper ? 'rgba(230, 184, 115, 0.5)' : 'rgba(130, 88, 42, 0.5)';
  const marginRightColor = isDarkPaper ? 'rgba(224, 109, 94, 0.54)' : 'rgba(165, 58, 42, 0.52)';
  const guideThreadColor = isDarkPaper ? 'rgba(230, 184, 115, 0.14)' : 'rgba(169, 108, 35, 0.16)';

  const hoveredExisting = hoverPct !== null ? findNearbyPin(hoverPct) : null;
  const hoverValidNew =
    hoverPct !== null &&
    hoveredExisting === null &&
    hoverPct >= marginLeft + 2 &&
    hoverPct <= marginRight - 2;

  return (
    <div
      className="absolute top-2 z-20 select-none no-print"
      style={{
        left: `${padX}px`,
        width: `${printableWidth}px`,
      }}
    >
      {/* Interactive Ruler Track */}
      <div
        role="group"
        aria-label="Penggaris tabulasi kertas — klik untuk pasang atau hapus pin Tab"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPct(null)}
        onClick={handleClick}
        className="relative h-7 cursor-crosshair group"
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
              {isMajor && pct > 0 && pct < 100 && hoverPct !== null && (
                <span
                  className="absolute -top-3.5 -translate-x-1/2 font-mono text-[8.5px] tabular-nums"
                  style={{
                    color: isDarkPaper ? 'rgba(235, 224, 200, 0.45)' : 'rgba(62, 52, 40, 0.45)',
                  }}
                >
                  {pct}
                </span>
              )}
            </div>
          );
        })}

        {/* Left & Right Margin Stop Brackets */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-3.5 border-l-2 border-t-2"
          style={{
            left: `${marginLeft}%`,
            width: '7px',
            borderColor: marginLeftColor,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-3.5 border-r-2 border-t-2"
          style={{
            left: `calc(${marginRight}% - 7px)`,
            width: '7px',
            borderColor: marginRightColor,
          }}
        />

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

        {/* Quiet inline micro-status label ONLY while hovering ruler */}
        {hoverPct !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 right-0 font-mono text-[9.5px] tabular-nums tracking-tight"
            style={{
              color: isDarkPaper ? 'rgba(235, 224, 200, 0.58)' : 'rgba(62, 52, 40, 0.58)',
            }}
          >
            {hoveredExisting !== null
              ? `Klik untuk hapus Tab ${hoveredExisting}%`
              : hoverValidNew
                ? `Klik untuk pasang Tab ${hoverPct}%`
                : 'Di luar batas margin'}
          </div>
        )}
      </div>

      {/* Ultra-subtle full-height vertical alignment threads revealed ONLY while hovering the ruler */}
      {hoverPct !== null &&
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
    </div>
  );
};
