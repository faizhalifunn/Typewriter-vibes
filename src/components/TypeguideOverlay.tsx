import React from 'react';
import { temperatureToLightColors } from '../constants/presets';
import type { EditorSettings } from '../types';

interface TypeguideOverlayProps {
  /** Viewport-relative X coordinate of the active caret (px) */
  x: number;
  /** Viewport-relative Y coordinate of the baseline right under the active caret (px) */
  y: number;
  /** Current line height in px */
  lineHeight: number;
  settings: EditorSettings;
  isDarkPaper: boolean;
  isCarriageReturning: boolean;
  strikePulse: boolean;
  /** Angle in degrees (-34..+34) derived from physical QWERTY key position */
  strikeAngle: number;
  /** True when two typebars physically jammed in Over-Realism mode */
  isTypebarJammed: boolean;
}

export const TypeguideOverlay: React.FC<TypeguideOverlayProps> = ({
  x,
  y,
  lineHeight,
  settings,
  isDarkPaper,
  isCarriageReturning,
  strikePulse,
  strikeAngle,
  isTypebarJammed,
}) => {
  const lightPreset = temperatureToLightColors(settings.lightTemperature);
  const intensity = settings.lightEnabled ? settings.lightIntensity / 100 : 0;
  const spreadRatio = settings.lightSpread / 100; // 0.2 .. 1.0
  const darknessRatio = settings.darkness / 100; // 0 .. 1

  // Dimensions of the upward volumetric light cone
  const beamWidth = Math.round(170 + spreadRatio * 420); // 254px .. 590px
  const beamHeight = Math.round(230 + spreadRatio * 290); // 288px .. 520px

  // Spotlight cutout center sits slightly above the typeguide, right over the caret & upper lines
  const spotlightCenterY = y - lineHeight * 1.45;
  const cutoutRadiusX = Math.round(130 + spreadRatio * 260 + intensity * 110);
  const cutoutRadiusY = Math.round(155 + spreadRatio * 240 + intensity * 125);

  // Smooth transition when typeguide follows caret; zero lag in static mode (already fixed center)
  const guideTransition =
    settings.typeguideMode === 'static'
      ? 'none'
      : isCarriageReturning
        ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
        : 'transform 68ms cubic-bezier(0.2, 0.85, 0.25, 1)';

  // Ambient darkness overlay alpha (capped so text remains legible even if lamp is off)
  const outerDarkAlpha = Math.min(0.92, darknessRatio * (isDarkPaper ? 0.78 : 0.88));
  const innerDarkAlpha = settings.lightEnabled
    ? Math.max(0, outerDarkAlpha * (1 - intensity * 0.94))
    : Math.min(0.76, outerDarkAlpha * 0.88);

  const strikeBoost = strikePulse ? 1.14 : 1;
  const beamCoreOpacity = Math.min(
    0.85,
    intensity * (isDarkPaper ? 0.44 : 0.34 + darknessRatio * 0.34) * strikeBoost
  );
  const beamOuterOpacity = Math.min(
    0.65,
    intensity * (isDarkPaper ? 0.28 : 0.22 + darknessRatio * 0.28) * strikeBoost
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden no-print" aria-hidden="true">
      {/* 1. Ambient Room Darkness Veil with Dynamic Upward Spotlight Opening */}
      {darknessRatio > 0.01 && (
        <div
          className="absolute inset-0 transition-opacity duration-200"
          style={{
            background: settings.lightEnabled
              ? `radial-gradient(${cutoutRadiusX}px ${cutoutRadiusY}px at ${x}px ${spotlightCenterY}px, rgba(6, 5, 4, ${innerDarkAlpha.toFixed(3)}) 0%, rgba(8, 7, 6, ${(innerDarkAlpha + (outerDarkAlpha - innerDarkAlpha) * 0.45).toFixed(3)}) 46%, rgba(8, 7, 6, ${outerDarkAlpha.toFixed(3)}) 100%)`
              : `rgba(8, 7, 6, ${outerDarkAlpha.toFixed(3)})`,
          }}
        />
      )}

      {/* 2. Subtle Platen Alignment Scale Bar spanning horizontally along the active strike line */}
      {settings.showGuideRuler && (
        <div
          className="absolute left-0 right-0 motion-safe-transition"
          style={{
            transform: `translate3d(0, ${Math.round(y + 5)}px, 0)`,
            transition:
              settings.typeguideMode === 'static'
                ? 'none'
                : 'transform 120ms cubic-bezier(0.2, 0.85, 0.25, 1)',
          }}
        >
          <div
            className={`mx-auto h-[14px] relative ${
              settings.paperLayout === 'unlimited' ? 'max-w-[980px] w-[96vw]' : 'max-w-[760px] w-[92vw]'
            }`}
            style={{
              borderTop: isDarkPaper
                ? '1px solid rgba(245, 224, 185, 0.14)'
                : '1px solid rgba(60, 48, 36, 0.16)',
              background: isDarkPaper
                ? 'linear-gradient(180deg, rgba(255, 232, 195, 0.05) 0%, rgba(255, 232, 195, 0) 100%)'
                : 'linear-gradient(180deg, rgba(40, 32, 24, 0.05) 0%, rgba(40, 32, 24, 0) 100%)',
            }}
          >
            {/* Fine typewriter alignment ticks */}
            <div
              className="h-[6px] w-full opacity-45"
              style={{
                backgroundImage: isDarkPaper
                  ? 'repeating-linear-gradient(90deg, rgba(245,220,180,0.42) 0px, rgba(245,220,180,0.42) 1px, transparent 1px, transparent 10px)'
                  : 'repeating-linear-gradient(90deg, rgba(50,40,30,0.36) 0px, rgba(50,40,30,0.36) 1px, transparent 1px, transparent 10px)',
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Moving or Static Typeguide Assembly + Upward Light Cone */}
      <div
        className="absolute left-0 top-0 will-change-transform motion-safe-transition"
        style={{
          transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
          transition: guideTransition,
        }}
      >
        {/* 3a. Upward Volumetric Light Cone radiating UP from the typeguide slot */}
        {settings.lightEnabled && intensity > 0.01 && (
          <div
            className="absolute bottom-[2px] left-0 -translate-x-1/2"
            style={{
              width: `${beamWidth}px`,
              height: `${beamHeight}px`,
              mixBlendMode: isDarkPaper ? 'screen' : 'soft-light',
            }}
          >
            {/* Wide atmospheric upward cone */}
            <div
              className="absolute inset-0"
              style={{
                background: `conic-gradient(from -32deg at 50% 100%, transparent 0deg, rgba(${lightPreset.rgb}, ${beamOuterOpacity.toFixed(3)}) 16deg, rgba(${lightPreset.rgb}, ${(beamCoreOpacity * 1.05).toFixed(3)}) 32deg, rgba(${lightPreset.rgb}, ${beamOuterOpacity.toFixed(3)}) 48deg, transparent 64deg)`,
                maskImage:
                  'radial-gradient(ellipse 68% 92% at 50% 100%, black 0%, rgba(0,0,0,0.75) 45%, transparent 98%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 68% 92% at 50% 100%, black 0%, rgba(0,0,0,0.75) 45%, transparent 98%)',
                filter: 'blur(8px)',
              }}
            />

            {/* Tight focused upward core beam illuminating caret and immediate words */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: `${Math.round(beamWidth * 0.44)}px`,
                height: `${Math.round(beamHeight * 0.72)}px`,
                background: `radial-gradient(ellipse 52% 88% at 50% 100%, rgba(${lightPreset.rgb}, ${Math.min(0.95, beamCoreOpacity * 1.45).toFixed(3)}) 0%, rgba(${lightPreset.rgb}, ${(beamCoreOpacity * 0.55).toFixed(3)}) 48%, transparent 100%)`,
                filter: 'blur(6px)',
              }}
            />
          </div>
        )}

        {/* 3b. Additive Warm Halo right at the strike point (visible even on light paper) */}
        {settings.lightEnabled && intensity > 0.01 && (
          <div
            className="absolute bottom-[4px] left-0 -translate-x-1/2"
            style={{
              width: `${Math.round(120 + spreadRatio * 140)}px`,
              height: `${Math.round(95 + spreadRatio * 90)}px`,
              background: `radial-gradient(ellipse 55% 75% at 50% 94%, rgba(${lightPreset.rgb}, ${(intensity * (isDarkPaper ? 0.34 : 0.22) * strikeBoost).toFixed(3)}) 0%, rgba(${lightPreset.rgb}, ${(intensity * 0.08).toFixed(3)}) 55%, transparent 100%)`,
              filter: 'blur(5px)',
            }}
          />
        )}

        {/* 3b-ii. Physical Flying Steel Typebar Arm Silhouette (flicks up into V-notch on keypress) */}
        {settings.typebarAnimation && strikePulse && !isTypebarJammed && (
          <div
            className="absolute left-0 top-[6px] origin-bottom pointer-events-none"
            style={{
              width: '8px',
              height: `${Math.round(lineHeight * 1.1 + 14)}px`,
              transform: `translate(-50%, -86%) rotate(${strikeAngle}deg)`,
            }}
          >
            <svg width="8" height="100%" viewBox="0 0 8 44" fill="none">
              <defs>
                <linearGradient id="steelArm" x1="0" y1="0" x2="8" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1c1917" />
                  <stop offset="48%" stopColor="#8f8679" />
                  <stop offset="100%" stopColor="#26221f" />
                </linearGradient>
              </defs>
              {/* Type slug head at top */}
              <rect x="1" y="0" width="6" height="9" rx="1" fill="url(#steelArm)" opacity="0.92" />
              {/* Slender steel lever arm */}
              <rect x="2.6" y="8" width="2.8" height="36" fill="url(#steelArm)" opacity="0.78" />
            </svg>
          </div>
        )}

        {/* 3b-iii. Physically Jammed Crossed Steel Typebars (Over-Realism key mash jam!) */}
        {isTypebarJammed && (
          <div className="absolute left-0 top-[2px] -translate-x-1/2 -translate-y-[74%] pointer-events-none">
            <svg
              width="54"
              height="48"
              viewBox="0 0 54 48"
              fill="none"
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]"
            >
              <defs>
                <linearGradient id="jamSteelA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a69c8e" />
                  <stop offset="55%" stopColor="#3c3731" />
                  <stop offset="100%" stopColor="#1b1815" />
                </linearGradient>
              </defs>
              {/* Left jammed typebar */}
              <g transform="rotate(-24 27 42)">
                <rect x="23" y="4" width="7" height="10" rx="1" fill="url(#jamSteelA)" stroke="#d6c5a9" strokeWidth="0.6" />
                <rect x="25" y="13" width="3.2" height="34" fill="url(#jamSteelA)" />
              </g>
              {/* Right tangled typebar */}
              <g transform="rotate(26 27 42)">
                <rect x="24" y="5" width="7" height="10" rx="1" fill="url(#jamSteelA)" stroke="#d6c5a9" strokeWidth="0.6" />
                <rect x="25.8" y="14" width="3.2" height="33" fill="url(#jamSteelA)" />
              </g>
            </svg>
          </div>
        )}

        {/* 3c. Precision Metallic Typeguide Fork (sits directly under the caret baseline) */}
        <div
          className="absolute left-0 top-[2px] -translate-x-1/2 transition-transform duration-75"
          style={{
            transform: strikePulse ? 'translateY(-1.5px)' : 'translateY(0px)',
          }}
        >
          <svg
            width="52"
            height="30"
            viewBox="0 0 52 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
          >
            <defs>
              <linearGradient id="brassBody" x1="0" y1="0" x2="52" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6a5841" />
                <stop offset="38%" stopColor="#c7a36b" />
                <stop offset="52%" stopColor="#e8cc99" />
                <stop offset="72%" stopColor="#8f7248" />
                <stop offset="100%" stopColor="#463929" />
              </linearGradient>
              <linearGradient id="gunmetalBase" x1="26" y1="10" x2="26" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3c3732" />
                <stop offset="100%" stopColor="#1b1816" />
              </linearGradient>
            </defs>

            {/* Left & Right classic V-notch alignment prongs cradling the strike point */}
            <path
              d="M7 22 L17 4 L21.5 4 L23 11 L29 11 L30.5 4 L35 4 L45 22 L38 26 L14 26 Z"
              fill="url(#gunmetalBase)"
              stroke="url(#brassBody)"
              strokeWidth="1.35"
              strokeLinejoin="round"
            />

            {/* Machined brass upper guide rails */}
            <path
              d="M17.5 4.8 L21.2 4.8 L22.6 11.4 L29.4 11.4 L30.8 4.8 L34.5 4.8"
              stroke="url(#brassBody)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Center alignment pointer notch */}
            <path d="M26 7.2 L26 11.2" stroke="#f3d6a2" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />

            {/* Lamp housing aperture recessed inside the typeguide fork */}
            <rect
              x="21.5"
              y="13.5"
              width="9"
              height="3.2"
              rx="1.6"
              fill={settings.lightEnabled && intensity > 0.02 ? lightPreset.coreHex : '#2a2622'}
              opacity={settings.lightEnabled ? Math.max(0.35, intensity) : 0.8}
            />
            {settings.lightEnabled && intensity > 0.02 && (
              <ellipse
                cx="26"
                cy="14.6"
                rx="6.2"
                ry="2.6"
                fill={lightPreset.filamentHex}
                opacity={Math.min(0.95, intensity * 0.85)}
                style={{ filter: 'blur(1.5px)' }}
              />
            )}

            {/* Tiny machined brass rivets */}
            <circle cx="15.5" cy="20.5" r="1.4" fill="url(#brassBody)" />
            <circle cx="36.5" cy="20.5" r="1.4" fill="url(#brassBody)" />
          </svg>
        </div>
      </div>
    </div>
  );
};
