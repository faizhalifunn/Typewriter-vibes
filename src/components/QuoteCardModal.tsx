import React, { useEffect, useMemo, useState } from 'react';
import { AlignCenter, AlignLeft, Camera, Check, Quote, X } from 'lucide-react';
import { FONT_PRESETS, PAPER_PRESETS } from '../constants/presets';
import { getDeterministicStrikeMetrics } from '../utils/imperfection';
import { exportQuoteCardPng } from '../utils/paperExporter';
import type { EditorSettings, QuoteAspectRatio } from '../types';

interface QuoteCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  defaultTitle: string;
  timestamp: number;
  settings: EditorSettings;
}

const RATIOS: { id: QuoteAspectRatio; label: string; desc: string; aspectClass: string }[] = [
  { id: '1:1', label: '1 : 1', desc: 'Persegi', aspectClass: 'aspect-square' },
  { id: '4:5', label: '4 : 5', desc: 'Potret Feed', aspectClass: 'aspect-[4/5]' },
  { id: '9:16', label: '9 : 16', desc: 'Cerita / Story', aspectClass: 'aspect-[9/16]' },
];

export const QuoteCardModal: React.FC<QuoteCardModalProps> = ({
  isOpen,
  onClose,
  initialText,
  defaultTitle,
  timestamp,
  settings,
}) => {
  const [quoteText, setQuoteText] = useState(initialText);
  const [attribution, setAttribution] = useState(defaultTitle);
  const [ratio, setRatio] = useState<QuoteAspectRatio>('4:5');
  const [align, setAlign] = useState<'left' | 'center'>('left');
  const [showStamp, setShowStamp] = useState(settings.stampStyle !== 'none');
  const [isExporting, setIsExporting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuoteText(initialText);
      setAttribution(defaultTitle);
      setShowStamp(settings.stampStyle !== 'none');
      setSaved(false);
    }
  }, [isOpen, initialText, defaultTitle, settings.stampStyle]);

  const paperPreset = PAPER_PRESETS[settings.paperTexture] ?? PAPER_PRESETS.ivory;
  const fontPreset = FONT_PRESETS[settings.fontId];

  const stampDateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
        .format(new Date(timestamp || Date.now()))
        .toUpperCase();
    } catch {
      return '26 NOV 2026';
    }
  }, [timestamp]);

  if (!isOpen) return null;

  const patternClass =
    paperPreset.pattern === 'dots'
      ? 'paper-modern-dots'
      : paperPreset.pattern === 'grid'
        ? 'paper-modern-grid'
        : paperPreset.pattern === 'slate'
          ? 'paper-modern-slate'
          : paperPreset.pattern === 'bond'
            ? 'paper-modern-bond'
            : paperPreset.pattern === 'charcoal'
              ? 'paper-charcoal-texture'
              : '';

  const previewText = quoteText.trim() || 'Tuliskan kutipan terbaikmu di sini...';
  const previewFontSize =
    previewText.length < 80
      ? '15px'
      : previewText.length < 160
        ? '13px'
        : previewText.length < 260
          ? '11.5px'
          : '10.5px';

  const inkColor =
    settings.ribbonColor === 'red'
      ? paperPreset.isDark
        ? '#e06d5e'
        : '#9c261d'
      : settings.ribbonColor === 'blue'
        ? paperPreset.isDark
          ? '#79aee8'
          : '#1e4478'
        : settings.inkWear === 'faded'
          ? paperPreset.inkFadedColor
          : paperPreset.inkColor;
  const vintage = settings.vintageIntensity / 100;
  const previewLetterSpacing =
    Math.abs(settings.letterSpacing ?? 0) < 0.05
      ? undefined
      : `${((settings.letterSpacing ?? 0) * 0.72).toFixed(2)}px`;

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportQuoteCardPng({
        quoteText,
        attribution,
        ratio,
        align,
        showStamp,
        timestamp,
        settings,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } finally {
      setIsExporting(false);
    }
  };

  const renderTiltedPreview = (text: string) => {
    if (settings.imperfectionIntensity <= 0) {
      return text;
    }
    return Array.from(text).map((ch, idx) => {
      if (ch === '\n') return <br key={idx} />;
      if (ch === ' ') return <span key={idx}> </span>;
      const m = getDeterministicStrikeMetrics(
        idx,
        ch,
        settings.imperfectionIntensity,
        settings.imperfectionPreset
      );
      return (
        <span
          key={idx}
          className="inline-block"
          style={{
            opacity: m.inkAlpha,
            transform: `translate(${(m.jitterX * 0.4).toFixed(2)}px, ${(m.jitterY * 0.4).toFixed(2)}px) rotate(${m.rotation.toFixed(2)}deg)`,
          }}
        >
          {ch}
        </span>
      );
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="aksara-quote-title"
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-[#181512] border border-[#f5e6cf]/14 text-[#ece4d8] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f5e6cf]/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Quote className="h-4 w-4 text-[#e6b873]" />
            <h2 id="aksara-quote-title" className="text-sm font-semibold text-[#faf3e8]">
              Studio Kartu Kutipan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup studio kartu kutipan"
            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-[#a3988b] hover:text-[#faf3e8] hover:bg-white/8 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Split: Left Controls, Right Live Card Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 p-6 aksara-scroll">
          {/* Controls Column */}
          <div className="md:col-span-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="quote-text-input" className="text-xs font-medium text-[#c5bbb0]">
                  Teks Kutipan
                </label>
                <span className="text-[11px] text-[#8f8579] tabular-nums">
                  {quoteText.trim().length} karakter
                </span>
              </div>
              <textarea
                id="quote-text-input"
                rows={5}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Pilih atau tulis potongan kalimat yang ingin dijadikan kartu..."
                className="w-full rounded-lg bg-[#110f0d] border border-white/10 focus:border-[#e6b873]/55 px-3.5 py-2.5 text-xs leading-relaxed text-[#f3ece2] placeholder:text-[#786f64] focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="quote-attr-input" className="text-xs font-medium text-[#c5bbb0]">
                Sumber / Judul Naskah (Opsional)
              </label>
              <input
                id="quote-attr-input"
                type="text"
                value={attribution}
                onChange={(e) => setAttribution(e.target.value)}
                placeholder="Contoh: Catatan Malam · Ipun"
                className="w-full rounded-lg bg-[#110f0d] border border-white/10 focus:border-[#e6b873]/55 px-3.5 py-2 text-xs text-[#f3ece2] placeholder:text-[#786f64] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[#c5bbb0]">Rasio Foto</div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#110f0d]">
                {RATIOS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRatio(r.id)}
                    className={`py-2 px-2 rounded-md text-center transition-colors ${
                      ratio === r.id
                        ? 'bg-[#2a241e] text-[#f3ca86]'
                        : 'text-[#9b9184] hover:text-[#e6dfd5]'
                    }`}
                  >
                    <div className="text-xs font-semibold tabular-nums">{r.label}</div>
                    <div className="text-[10px] opacity-75">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#c5bbb0]">Perataan</div>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#110f0d]">
                  <button
                    type="button"
                    onClick={() => setAlign('left')}
                    className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      align === 'left'
                        ? 'bg-[#2a241e] text-[#f3ca86]'
                        : 'text-[#9b9184] hover:text-[#e6dfd5]'
                    }`}
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                    <span>Kiri</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlign('center')}
                    className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      align === 'center'
                        ? 'bg-[#2a241e] text-[#f3ca86]'
                        : 'text-[#9b9184] hover:text-[#e6dfd5]'
                    }`}
                  >
                    <AlignCenter className="h-3.5 w-3.5" />
                    <span>Tengah</span>
                  </button>
                </div>
              </div>

              {settings.stampStyle !== 'none' && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#c5bbb0]">Stempel Tanggal</div>
                  <button
                    type="button"
                    onClick={() => setShowStamp((prev) => !prev)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                      showStamp
                        ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f3ca86]'
                        : 'bg-[#110f0d] border-white/8 text-[#9b9184]'
                    }`}
                  >
                    {showStamp ? 'Tampilkan Stempel' : 'Sembunyikan'}
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#8d8377] leading-relaxed">
              Kartu otomatis mewarisi kertas <span className="text-[#d9cfc1]">{paperPreset.name}</span>, huruf{' '}
              <span className="text-[#d9cfc1]">{fontPreset.name}</span>, efek vintage, dan karakter huruf miring aktif.
            </p>
          </div>

          {/* Live Preview Column */}
          <div className="md:col-span-6 flex items-center justify-center rounded-xl bg-[#100e0c] border border-white/6 p-5 min-h-[340px]">
            <div
              className={`relative overflow-hidden shadow-2xl border border-black/35 flex flex-col justify-center ${
                RATIOS.find((r) => r.id === ratio)?.aspectClass
              } ${patternClass}`}
              style={{
                width: ratio === '9:16' ? '210px' : ratio === '4:5' ? '270px' : '295px',
                backgroundColor: paperPreset.baseBg,
              }}
            >
              {paperPreset.imageUrl && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: `url(${paperPreset.imageUrl})`,
                    backgroundSize: 'cover',
                    opacity: paperPreset.textureOpacity,
                    filter: paperPreset.imageFilter,
                  }}
                />
              )}
              {vintage > 0.01 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: paperPreset.isDark
                      ? `rgba(128, 86, 38, ${(vintage * 0.14).toFixed(3)})`
                      : `rgba(156, 108, 46, ${(vintage * 0.24).toFixed(3)})`,
                    boxShadow: `inset 0 0 36px rgba(${paperPreset.isDark ? '0,0,0' : '74,46,18'}, ${(vintage * 0.42).toFixed(3)})`,
                  }}
                />
              )}

              {/* Inner editorial hairline frame */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-3 border"
                style={{
                  borderColor: paperPreset.isDark
                    ? 'rgba(235, 224, 200, 0.14)'
                    : 'rgba(34, 28, 22, 0.14)',
                }}
              />

              {showStamp && settings.stampStyle !== 'none' && (() => {
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
                    className="pointer-events-none absolute top-5 right-5 -rotate-3 select-none"
                    style={{
                      color: isRedStamp
                        ? paperPreset.isDark
                          ? 'rgba(230,108,92,0.75)'
                          : 'rgba(158,38,30,0.72)'
                        : paperPreset.isDark
                          ? 'rgba(230,222,208,0.58)'
                          : 'rgba(42,36,30,0.56)',
                    }}
                  >
                    <div
                      className={
                        isDoubleFrame
                          ? 'border-[1.5px] border-current p-[1.5px]'
                          : 'border border-current px-1.5 py-0.5 text-center'
                      }
                    >
                      <div className={isDoubleFrame ? 'border border-current px-1.5 py-0.5 text-center' : ''}>
                        {topLine && (
                          <div className="font-typewriter-courier text-[5.5px] font-bold tracking-[0.14em] leading-tight">
                            {topLine}
                          </div>
                        )}
                        <div className="font-typewriter-special text-[7px] font-bold tracking-wider leading-tight">
                          {mainLine}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div
                className={`relative z-10 px-7 py-8 ${fontPreset.className} ${
                  align === 'center' ? 'text-center' : 'text-left'
                }`}
                style={{ color: inkColor }}
              >
                <div
                  className="font-brand-serif text-3xl leading-none mb-1 opacity-25 select-none"
                  aria-hidden="true"
                >
                  “
                </div>
                <div
                  className="whitespace-pre-wrap break-words leading-relaxed"
                  style={{
                    fontSize: previewFontSize,
                    letterSpacing: previewLetterSpacing,
                  }}
                >
                  {renderTiltedPreview(previewText)}
                </div>
                {attribution.trim() && (
                  <div className="mt-3 text-[9.5px] opacity-65 truncate">
                    — {attribution.trim()}
                  </div>
                )}
              </div>

              <div
                className="pointer-events-none absolute bottom-4 left-0 right-0 text-center font-brand-serif text-xs opacity-35"
                style={{ color: inkColor }}
              >
                Aksara
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#f5e6cf]/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[#b5aba0] hover:text-[#faf3e8] hover:bg-white/6 transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#e6b873] hover:bg-[#f0c888] disabled:opacity-60 text-[#17130f] text-xs font-semibold transition-colors whitespace-nowrap"
          >
            {saved ? <Check className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
            <span>
              {isExporting
                ? 'Menyimpan Kartu...'
                : saved
                  ? 'Kartu Tersimpan'
                  : 'Simpan Kartu (PNG 2x)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
