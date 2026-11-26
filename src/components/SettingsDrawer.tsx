import React, { useState } from 'react';
import {
  FileText,
  Music,
  RotateCcw,
  Sun,
  Type,
  Volume2,
  X,
} from 'lucide-react';
import {
  AMBIENT_CHANNELS,
  AMBIENT_MIXER_PRESETS,
  BELL_VARIANTS,
  DEFAULT_TAB_STOPS,
  FONT_PRESETS,
  IMPERFECTION_PRESETS,
  MOOD_PRESETS,
  PAPER_PRESETS,
  SOUND_PROFILES,
  STAMP_CUSTOM_PRESETS,
  STAMP_STYLES,
  temperatureToLightColors,
} from '../constants/presets';
import { typewriterAudio } from '../audio/typewriterAudio';
import type {
  AmbientChannelId,
  BellVariantId,
  EditorSettings,
  FontId,
  ImperfectionPresetId,
  InkWearId,
  LineSpacingId,
  PaperLayoutId,
  PaperTextureId,
  RibbonColorId,
  StampStyleId,
  TypingModeId,
} from '../types';

type SettingsTab = 'light' | 'paper' | 'sound' | 'music' | 'font';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  ribbonInk: number;
  onSwapRibbon: () => void;
  onUpdate: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  onApplyPatch: (patch: Partial<EditorSettings>) => void;
  onReset: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  ribbonInk,
  onSwapRibbon,
  onUpdate,
  onApplyPatch,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('light');

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Cahaya', icon: <Sun className="h-3.5 w-3.5" /> },
    { id: 'paper', label: 'Kertas', icon: <FileText className="h-3.5 w-3.5" /> },
    { id: 'sound', label: 'Suara', icon: <Volume2 className="h-3.5 w-3.5" /> },
    { id: 'music', label: 'Musik', icon: <Music className="h-3.5 w-3.5" /> },
    { id: 'font', label: 'Huruf', icon: <Type className="h-3.5 w-3.5" /> },
  ];

  const handleTestSound = () => {
    const { soundProfile, soundVolume, soundTone, marginBell, bellVariant } = settings;
    const effectiveVol = Math.max(soundVolume, 45);
    const effectiveProfile = soundProfile === 'silent' ? 'classic' : soundProfile;
    typewriterAudio.playKeyStrike(effectiveProfile, effectiveVol, soundTone, 'a');
    window.setTimeout(() => {
      typewriterAudio.playKeyStrike(effectiveProfile, effectiveVol, soundTone, 'k');
    }, 115);
    window.setTimeout(() => {
      typewriterAudio.playSpacebar(effectiveProfile, effectiveVol, soundTone);
    }, 235);
    window.setTimeout(() => {
      typewriterAudio.playCarriageReturn(
        effectiveProfile,
        effectiveVol,
        soundTone,
        marginBell,
        bellVariant
      );
    }, 390);
  };

  const handleSelectBellVariant = (variant: BellVariantId) => {
    onUpdate('bellVariant', variant);
    const effectiveVol = Math.max(settings.soundVolume, 55);
    const effectiveProfile = settings.soundProfile === 'silent' ? 'classic' : settings.soundProfile;
    typewriterAudio.playCarriageReturn(
      effectiveProfile,
      effectiveVol,
      settings.soundTone,
      true,
      variant
    );
  };

  return (
    <aside
      aria-label="Pengaturan Aksara"
      className="fixed right-4 top-16 bottom-4 z-40 w-[356px] max-w-[calc(100vw-2rem)] flex flex-col rounded-xl bg-[#191614]/92 text-[#ebe5db] border border-[#f5e6cf]/12 shadow-2xl backdrop-blur-xl no-print"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5e6cf]/10">
        <h2 className="text-sm font-semibold tracking-tight text-[#f5efe6]">
          Pengaturan Ruang Ketik
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pengaturan"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#a89f93] hover:text-[#f5efe6] hover:bg-white/6 transition-colors focus-visible:outline-2 focus-visible:outline-[#e6b873]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category Switcher */}
      <div className="px-4 pt-3 pb-2 border-b border-[#f5e6cf]/8">
        <div className="grid grid-cols-5 gap-1 p-1 rounded-lg bg-[#110f0d]">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#e6b873] ${
                  active
                    ? 'bg-[#2a241e] text-[#f3ca86]'
                    : 'text-[#9b9184] hover:text-[#e6dfd5]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 aksara-scroll">
        {/* TAB 1: CAHAYA & TYPEGUIDE */}
        {activeTab === 'light' && (
          <>
            <section className="space-y-2.5">
              <div className="text-xs font-medium text-[#c5bbb0]">Mode Mesin Ketik</div>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#110f0d]">
                {(
                  [
                    { id: 'standard', label: 'Mode Standar' },
                    { id: 'over_realism', label: 'Over-Realism' },
                  ] as { id: TypingModeId; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdate('typingMode', opt.id)}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      settings.typingMode === opt.id
                        ? 'bg-[#2a241e] text-[#f3ca86]'
                        : 'text-[#9b9184] hover:text-[#e6dfd5]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#8f8579] leading-relaxed">
                {settings.typingMode === 'over_realism'
                  ? 'Tinta permanen tanpa hapus. Panah menggeser gulungan secara bebas tanpa snap otomatis, dengan kunci margin dan pilihan pita tinta.'
                  : 'Suntingan bebas dengan rasa mesin ketik klasik serta batas margin tetap yang proporsional terhadap lebar kertas.'}
              </p>

              {/* Warna Pita Tinta (Hitam, Biru, Merah di semua mode + Koreksi di Over-Realism) */}
              <div className="pt-2 space-y-1.5 border-t border-white/8">
                <div className="text-xs font-medium text-[#c5bbb0]">
                  {settings.typingMode === 'over_realism' ? 'Pita Tinta & Koreksi' : 'Warna Pita Tinta'}
                </div>
                <div
                  className={`grid gap-1 p-1 rounded-lg bg-[#110f0d] ${
                    settings.typingMode === 'over_realism' ? 'grid-cols-4' : 'grid-cols-3'
                  }`}
                >
                  {(
                    [
                      { id: 'black', label: 'Hitam' },
                      { id: 'blue', label: 'Biru' },
                      { id: 'red', label: 'Merah' },
                      ...(settings.typingMode === 'over_realism'
                        ? [{ id: 'correction' as RibbonColorId, label: 'Koreksi' }]
                        : []),
                    ] as { id: RibbonColorId; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdate('ribbonColor', opt.id)}
                      className={`py-1.5 px-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        settings.ribbonColor === opt.id
                          ? opt.id === 'red'
                            ? 'bg-[#361b18] text-[#f08b7e]'
                            : opt.id === 'blue'
                              ? 'bg-[#192c46] text-[#8bc0f7]'
                              : opt.id === 'correction'
                                ? 'bg-[#e8e3d8] text-[#171411]'
                                : 'bg-[#2a241e] text-[#f3ca86]'
                          : 'text-[#9b9184] hover:text-[#e6dfd5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {settings.typingMode === 'over_realism' && (
                  <p className="text-[11px] text-[#8f8579] leading-snug">
                    Pintasan cepat: tekan Ctrl+Backspace atau Shift+Backspace untuk langsung menempel pita koreksi putih.
                  </p>
                )}
              </div>

              {settings.typingMode === 'over_realism' && (
                <div className="pt-2 space-y-3 border-t border-white/8">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium text-[#ece5db]">Pita Tinta Menipis</div>
                        <div className="text-[11px] text-[#91877b]">
                          Tinta perlahan memudar seiring ratusan ketukan
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.ribbonDepletionEnabled}
                        onChange={(val) => onUpdate('ribbonDepletionEnabled', val)}
                        label="Aktifkan simulasi pita tinta menipis"
                      />
                    </div>
                    {settings.ribbonDepletionEnabled && (
                      <div className="flex items-center justify-between rounded-lg bg-[#110f0d] px-3 py-2 border border-white/6">
                        <span className="text-[11px] text-[#b8afa2] tabular-nums">
                          Sisa tinta pita: <strong className="text-[#f3ca86]">{Math.round(ribbonInk)}%</strong>
                        </span>
                        <button
                          type="button"
                          onClick={onSwapRibbon}
                          className="text-[11px] font-semibold text-[#e6b873] hover:text-[#f5d298] transition-colors whitespace-nowrap"
                        >
                          Ganti Pita Baru
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 space-y-2.5 border-t border-white/8">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-[#ece5db]">Tuas Macet Jika Terlalu Cepat</div>
                        <div className="text-[11px] text-[#91877b]">Tekan Esc untuk melepas tuas tersangkut</div>
                      </div>
                      <ToggleSwitch
                        checked={settings.typebarJamEnabled}
                        onChange={(val) => onUpdate('typebarJamEnabled', val)}
                        label="Aktifkan simulasi tuas macet"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Margin & Lebar Ruang Tulis (fisik tetap terhadap lebar kertas, bebas & luas) */}
              <div className="pt-2 space-y-3 border-t border-white/8">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-[#ece5db]">Lebar Ruang Tulis & Margin</div>
                    <div className="text-[11px] text-[#91877b]">
                      Tetap stabil saat ukuran huruf berubah · Bisa juga diseret langsung di penggaris atas
                    </div>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-[#e6b873] whitespace-nowrap">
                    {settings.marginRight - settings.marginLeft}%
                  </span>
                </div>

                {/* Preset Lebar Cepat */}
                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  {[
                    { label: 'Penuh', left: 0, right: 100 },
                    { label: 'Luas', left: 6, right: 94 },
                    { label: 'Naskah', left: 12, right: 88 },
                    { label: 'Puisi', left: 20, right: 80 },
                  ].map((preset) => {
                    const isActive =
                      settings.marginLeft === preset.left && settings.marginRight === preset.right;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          onUpdate('marginLeft', preset.left);
                          onUpdate('marginRight', preset.right);
                        }}
                        className={`px-2 py-1.5 rounded border transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-[#2a2219] border-[#e6b873]/55 text-[#f5d59c] font-medium'
                            : 'bg-[#141210] border-white/8 text-[#b9afa2] hover:bg-[#231e19] hover:text-[#ece5db]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <SliderControl
                  label="Margin Kiri"
                  value={settings.marginLeft}
                  min={0}
                  max={Math.min(45, Math.max(0, settings.marginRight - 12))}
                  unit="%"
                  onChange={(v) => onUpdate('marginLeft', v)}
                />

                <SliderControl
                  label="Margin Kanan"
                  value={settings.marginRight}
                  min={Math.max(55, settings.marginLeft + 12)}
                  max={100}
                  unit="%"
                  onChange={(v) => onUpdate('marginRight', v)}
                />
              </div>

              {/* Penggaris Tabulasi Kustom (Tab Stops) */}
              <div className="pt-3 space-y-2.5 border-t border-white/8">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-[#ece5db]">Penggaris Tabulasi (Tab Stops)</div>
                    <div className="text-[11px] text-[#91877b]">
                      Klik langsung penggaris atas kertas untuk pasang/hapus pin Tab
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.showTabRuler}
                    onChange={(val) => onUpdate('showTabRuler', val)}
                    label="Tampilkan penggaris tabulasi di kertas"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {settings.tabStops.length === 0 ? (
                    <span className="text-[11px] text-[#847a6e] italic">
                      Belum ada pin Tab (tombol Tab melompat standar)
                    </span>
                  ) : (
                    settings.tabStops.map((stop) => (
                      <button
                        key={stop}
                        type="button"
                        onClick={() =>
                          onUpdate(
                            'tabStops',
                            settings.tabStops.filter((v) => v !== stop)
                          )
                        }
                        title={`Hapus pin Tab di ${stop}%`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#110f0d] hover:bg-[#351f1c] border border-white/8 hover:border-[#e06d5e]/45 text-[11px] font-mono tabular-nums text-[#e5d8c3] hover:text-[#f5a79c] transition-colors"
                      >
                        <span>{stop}%</span>
                        <span className="opacity-65">×</span>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onUpdate('tabStops', [...DEFAULT_TAB_STOPS])}
                    className="px-2 py-1 rounded bg-[#141210] hover:bg-[#231e19] border border-white/8 text-[#c2b8aa] hover:text-[#f3ca86] transition-colors whitespace-nowrap"
                  >
                    Standar
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate('tabStops', [14, 34, 54])}
                    className="px-2 py-1 rounded bg-[#141210] hover:bg-[#231e19] border border-white/8 text-[#c2b8aa] hover:text-[#f3ca86] transition-colors whitespace-nowrap"
                  >
                    Puisi
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate('tabStops', [20, 50, 78])}
                    className="px-2 py-1 rounded bg-[#141210] hover:bg-[#231e19] border border-white/8 text-[#c2b8aa] hover:text-[#f3ca86] transition-colors whitespace-nowrap"
                  >
                    Kolom
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate('tabStops', [])}
                    className="ml-auto px-2 py-1 rounded text-[#91877b] hover:text-[#f08b7e] transition-colors whitespace-nowrap"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-2.5">
              <div className="text-xs font-medium text-[#c5bbb0]">Mode Gerak Typeguide</div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdate('typeguideMode', 'follow')}
                  className={`text-left px-3.5 py-3 rounded-lg border transition-colors ${
                    settings.typeguideMode === 'follow'
                      ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                      : 'bg-[#141210] border-white/8 text-[#b0a699] hover:border-white/18'
                  }`}
                >
                  <div className="text-xs font-semibold">Typeguide Mengikuti Ketikan</div>
                  <div className="text-[11px] text-[#9b9184] mt-0.5 leading-relaxed">
                    Kertas diam di tengah, typeguide dan sorotan cahaya meluncur mengikuti kursor.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdate('typeguideMode', 'static')}
                  className={`text-left px-3.5 py-3 rounded-lg border transition-colors ${
                    settings.typeguideMode === 'static'
                      ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                      : 'bg-[#141210] border-white/8 text-[#b0a699] hover:border-white/18'
                  }`}
                >
                  <div className="text-xs font-semibold">Typeguide Statis (Kertas Bergeser)</div>
                  <div className="text-[11px] text-[#9b9184] mt-0.5 leading-relaxed">
                    Seperti mesin ketik asli: typeguide diam di tengah, lembar kertas bergeser ke kiri.
                  </div>
                </button>
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[#ece5db]">Sorotan Cahaya Typeguide</div>
                  <div className="text-[11px] text-[#91877b]">Menyorot ke atas tepat ke posisi ketikan</div>
                </div>
                <ToggleSwitch
                  checked={settings.lightEnabled}
                  onChange={(val) => onUpdate('lightEnabled', val)}
                  label="Nyalakan lampu typeguide"
                />
              </div>

              <SliderControl
                label="Intensitas Cahaya"
                value={settings.lightIntensity}
                min={10}
                max={100}
                unit="%"
                disabled={!settings.lightEnabled}
                onChange={(v) => onUpdate('lightIntensity', v)}
              />

              <SliderControl
                label="Lebar Sorotan"
                value={settings.lightSpread}
                min={20}
                max={100}
                unit="%"
                disabled={!settings.lightEnabled}
                onChange={(v) => onUpdate('lightSpread', v)}
              />

              <div className={`space-y-2.5 ${!settings.lightEnabled ? 'opacity-45 pointer-events-none' : ''}`}>
                {(() => {
                  const computed = temperatureToLightColors(settings.lightTemperature);
                  return (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#ece5db]">Suhu Cahaya</span>
                        <span className="inline-flex items-center gap-2 text-xs text-[#c7baa9] font-mono tabular-nums">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-white/25"
                            style={{
                              backgroundColor: computed.filamentHex,
                              boxShadow: `0 0 8px ${computed.filamentHex}`,
                            }}
                          />
                          <span>
                            {computed.label} · {computed.kelvin}K
                          </span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={settings.lightTemperature}
                        disabled={!settings.lightEnabled}
                        onChange={(e) => onUpdate('lightTemperature', Number(e.target.value))}
                        aria-label="Suhu Cahaya Hangat ke Dingin"
                        className="aksara-slider"
                        style={{
                          background:
                            'linear-gradient(90deg, #ff923a 0%, #ffc676 28%, #fff4e2 50%, #d6e8ff 74%, #96c6ff 100%)',
                          height: '6px',
                        }}
                      />
                      <div className="flex items-center justify-between text-[11px] text-[#8f8579]">
                        <button
                          type="button"
                          onClick={() => onUpdate('lightTemperature', -75)}
                          className="hover:text-[#ffc676] transition-colors"
                        >
                          Hangat
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdate('lightTemperature', 0)}
                          className="hover:text-[#fff4e2] transition-colors"
                        >
                          Netral
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdate('lightTemperature', 75)}
                          className="hover:text-[#a8ceff] transition-colors"
                        >
                          Dingin
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs font-medium text-[#ece5db]">Skala Penggaris Typeguide</div>
                  <div className="text-[11px] text-[#91877b]">Garis skala halus di bawah baris aktif</div>
                </div>
                <ToggleSwitch
                  checked={settings.showGuideRuler}
                  onChange={(val) => onUpdate('showGuideRuler', val)}
                  label="Tampilkan skala penggaris"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs font-medium text-[#ece5db]">Animasi Ayunan Tuas Huruf</div>
                  <div className="text-[11px] text-[#91877b]">Kilasan tuas logam di celah typeguide saat mengetik</div>
                </div>
                <ToggleSwitch
                  checked={settings.typebarAnimation}
                  onChange={(val) => onUpdate('typebarAnimation', val)}
                  label="Tampilkan animasi ayunan tuas huruf"
                />
              </div>
            </section>
          </>
        )}

        {/* TAB 2: KERTAS & VINTAGE */}
        {activeTab === 'paper' && (
          <>
            {/* Curated Instant Atmosphere Mood Presets */}
            <section className="space-y-2.5">
              <div className="text-xs font-medium text-[#c5bbb0]">Suasana Instan</div>
              <div className="grid grid-cols-2 gap-2">
                {MOOD_PRESETS.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => onApplyPatch(mood.patch)}
                    className="group text-left p-2.5 rounded-lg bg-[#141210] hover:bg-[#221d18] border border-white/8 hover:border-[#e6b873]/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0 border border-white/20"
                        style={{
                          background: `radial-gradient(circle at 35% 35%, ${mood.swatchGlow}, ${mood.swatchBg})`,
                        }}
                      />
                      <span className="text-xs font-semibold text-[#efe8de] truncate">
                        {mood.name}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[#8f8579] mt-1 leading-snug line-clamp-1">
                      {mood.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-3.5">
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#c5bbb0]">Bentang Kertas</div>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#110f0d]">
                  {(
                    [
                      { id: 'unlimited', label: 'Kertas Penuh' },
                      { id: 'sheet', label: 'Lembar Klasik' },
                    ] as { id: PaperLayoutId; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdate('paperLayout', opt.id)}
                      className={`py-2 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        settings.paperLayout === opt.id
                          ? 'bg-[#2a241e] text-[#f3ca86]'
                          : 'text-[#9b9184] hover:text-[#e6dfd5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#8f8579] leading-relaxed">
                  {settings.paperLayout === 'unlimited'
                    ? 'Seluruh layar dipenuhi tekstur kertas tanpa batas tepi kiri dan kanan.'
                    : 'Tampilan selembar kertas di atas permukaan meja kerja.'}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/8">
                <div className="text-xs font-medium text-[#c5bbb0]">Bentuk Halaman Vertikal</div>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#110f0d]">
                  <button
                    type="button"
                    onClick={() => onUpdate('paginationEnabled', false)}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      !settings.paginationEnabled
                        ? 'bg-[#2a241e] text-[#f3ca86]'
                        : 'text-[#9b9184] hover:text-[#e6dfd5]'
                    }`}
                  >
                    Gulungan Bebas
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate('paginationEnabled', true)}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      settings.paginationEnabled
                        ? 'bg-[#2a241e] text-[#f3ca86]'
                        : 'text-[#9b9184] hover:text-[#e6dfd5]'
                    }`}
                  >
                    Halaman Bernomor
                  </button>
                </div>
                <p className="text-[11px] text-[#8f8579] leading-relaxed">
                  {settings.paginationEnabled
                    ? 'Kertas terbagi menjadi lembar-lembar terpisah vertikal dengan nomor halaman otomatis.'
                    : 'Kertas memanjang ke bawah tanpa jeda halaman.'}
                </p>
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-4">
              {(['modern', 'classic'] as const).map((group) => {
                const items = (Object.keys(PAPER_PRESETS) as PaperTextureId[]).filter(
                  (id) => PAPER_PRESETS[id].category === group
                );
                return (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-[#c5bbb0]">
                        {group === 'modern' ? 'Kertas Modern' : 'Kertas Klasik & Vintage'}
                      </div>
                      {group === 'modern' && (
                        <span className="text-[10.5px] text-[#8f8579]">Bersih tanpa kesan usang</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {items.map((id) => {
                        const preset = PAPER_PRESETS[id];
                        const selected = settings.paperTexture === id;
                        const swatchPatternClass =
                          preset.pattern === 'dots'
                            ? 'paper-modern-dots'
                            : preset.pattern === 'grid'
                              ? 'paper-modern-grid'
                              : preset.pattern === 'slate'
                                ? 'paper-modern-slate'
                                : preset.pattern === 'bond'
                                  ? 'paper-modern-bond'
                                  : preset.pattern === 'charcoal'
                                    ? 'paper-charcoal-texture'
                                    : '';
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              const currentPreset = PAPER_PRESETS[settings.paperTexture];
                              if (
                                preset.category === 'modern' &&
                                currentPreset?.category !== 'modern' &&
                                settings.vintageIntensity > 0
                              ) {
                                onApplyPatch({
                                  paperTexture: id,
                                  vintageIntensity: 0,
                                });
                              } else {
                                onUpdate('paperTexture', id);
                              }
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                              selected
                                ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                                : 'bg-[#141210] border-white/6 text-[#b0a699] hover:border-white/18'
                            }`}
                          >
                            <div
                              className={`h-10 w-10 rounded-md shrink-0 border border-black/25 overflow-hidden ${swatchPatternClass}`}
                              style={{
                                backgroundColor: preset.swatchStyle,
                                backgroundImage: preset.imageUrl
                                  ? `url(${preset.imageUrl})`
                                  : undefined,
                                backgroundSize: preset.imageUrl
                                  ? 'cover'
                                  : preset.pattern === 'dots' || preset.pattern === 'grid'
                                    ? '10px 10px'
                                    : undefined,
                                filter: preset.imageFilter,
                              }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{preset.name}</div>
                              <div className="text-[11px] text-[#91877b] truncate">
                                {preset.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-4">
              <SliderControl
                label="Level Kegelapan Ruangan"
                hint="Meredupkan latar sehingga sorotan typeguide lebih menonjol"
                value={settings.darkness}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onUpdate('darkness', v)}
              />

              <SliderControl
                label="Intensitas Efek Vintage"
                hint="Sepia hangat, vinyet tepi kertas, dan tekstur serat halus"
                value={settings.vintageIntensity}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onUpdate('vintageIntensity', v)}
              />

              <div className="space-y-2">
                <div className="text-xs font-medium text-[#c5bbb0]">Kepekatan Pita Tinta</div>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#110f0d]">
                  {(
                    [
                      { id: 'fresh', label: 'Baru' },
                      { id: 'classic', label: 'Klasik' },
                      { id: 'faded', label: 'Pita Tua' },
                    ] as { id: InkWearId; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdate('inkWear', opt.id)}
                      className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        settings.inkWear === opt.id
                          ? 'bg-[#2a241e] text-[#f3ca86]'
                          : 'text-[#9b9184] hover:text-[#e6dfd5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="text-xs font-medium text-[#c5bbb0]">Cap Stempel Karet</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {STAMP_STYLES.map((st) => {
                    const active = settings.stampStyle === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          onUpdate('stampStyle', st.id as StampStyleId);
                          if (st.id !== 'none' && settings.soundProfile !== 'silent') {
                            typewriterAudio.playRubberStamp(Math.max(settings.soundVolume, 55));
                          }
                        }}
                        className={`px-2.5 py-2 rounded-lg border text-left transition-colors ${
                          active
                            ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                            : 'bg-[#141210] border-white/6 text-[#b0a699] hover:border-white/18'
                        }`}
                      >
                        <div className="text-[11.5px] font-semibold truncate">{st.name}</div>
                      </button>
                    );
                  })}
                </div>

                {settings.stampStyle !== 'none' && (
                  <div className="space-y-2.5 rounded-lg bg-[#110f0d] border border-white/8 p-3">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="aksara-stamp-custom-text"
                        className="text-[11.5px] font-medium text-[#d4cabd]"
                      >
                        Teks Cap Kustom
                      </label>
                      <input
                        id="aksara-stamp-custom-text"
                        type="text"
                        maxLength={28}
                        value={settings.stampCustomText}
                        onChange={(e) => onUpdate('stampCustomText', e.target.value)}
                        placeholder="Contoh: RAHASIA, DRAF I, atau Nama/Kota"
                        className="w-full rounded-md bg-[#191613] border border-white/10 focus:border-[#e6b873]/55 px-2.5 py-1.5 text-xs text-[#f4ede2] placeholder:text-[#786f64] focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {STAMP_CUSTOM_PRESETS.map((presetLabel) => (
                          <button
                            key={presetLabel}
                            type="button"
                            onClick={() => {
                              onUpdate('stampCustomText', presetLabel);
                              if (settings.soundProfile !== 'silent') {
                                typewriterAudio.playRubberStamp(
                                  Math.max(settings.soundVolume, 50)
                                );
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/12 text-[10px] font-mono text-[#b8afa2] hover:text-[#f3ca86] transition-colors"
                          >
                            {presetLabel}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-white/6">
                      <span className="text-[11.5px] text-[#d4cabd]">Sertakan Tanggal Otomatis</span>
                      <ToggleSwitch
                        checked={settings.stampShowDate}
                        onChange={(val) => onUpdate('stampShowDate', val)}
                        label="Sertakan tanggal otomatis di cap stempel"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* TAB 3: SUARA MEKANIKAL */}
        {activeTab === 'sound' && (
          <>
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-[#c5bbb0]">Karakter Suara Ketikan</div>
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="text-xs font-medium text-[#e6b873] hover:text-[#f5d298] transition-colors whitespace-nowrap"
                >
                  Uji Suara
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {SOUND_PROFILES.map((profile) => {
                  const selected = settings.soundProfile === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        onUpdate('soundProfile', profile.id);
                        if (profile.id !== 'silent') {
                          typewriterAudio.playKeyStrike(
                            profile.id,
                            Math.max(settings.soundVolume, 45),
                            settings.soundTone,
                            't'
                          );
                        }
                      }}
                      className={`px-3.5 py-2.5 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                          : 'bg-[#141210] border-white/6 text-[#b0a699] hover:border-white/18'
                      }`}
                    >
                      <div className="text-xs font-semibold">{profile.name}</div>
                      <div className="text-[11px] text-[#91877b] mt-0.5">{profile.description}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-[#c5bbb0]">Varian Dentingan Enter</div>
                <span className="text-[11px] text-[#8f8579]">Klik untuk pratinjau</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {BELL_VARIANTS.map((bell) => {
                  const selected = settings.bellVariant === bell.id;
                  return (
                    <button
                      key={bell.id}
                      type="button"
                      onClick={() => handleSelectBellVariant(bell.id)}
                      className={`px-3.5 py-2.5 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                          : 'bg-[#141210] border-white/6 text-[#b0a699] hover:border-white/18'
                      }`}
                    >
                      <div className="text-xs font-semibold">{bell.name}</div>
                      <div className="text-[11px] text-[#91877b] mt-0.5">{bell.description}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-4">
              <SliderControl
                label="Volume Ketikan"
                value={settings.soundVolume}
                min={0}
                max={100}
                unit="%"
                disabled={settings.soundProfile === 'silent'}
                onChange={(v) => onUpdate('soundVolume', v)}
              />

              <SliderControl
                label="Nada Mekanikal"
                hint="Kiri lebih berat & kayu, kanan lebih tajam & logam"
                value={settings.soundTone}
                min={-50}
                max={50}
                unit=""
                displayValue={
                  settings.soundTone === 0
                    ? 'Netral'
                    : settings.soundTone < 0
                      ? `Hangat ${settings.soundTone}`
                      : `Tajam +${settings.soundTone}`
                }
                disabled={settings.soundProfile === 'silent'}
                onChange={(v) => onUpdate('soundTone', v)}
              />

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs font-medium text-[#ece5db]">Bel Margin & Baris Baru</div>
                  <div className="text-[11px] text-[#91877b]">Denting bel saat akhir baris & Enter</div>
                </div>
                <ToggleSwitch
                  checked={settings.marginBell}
                  onChange={(val) => {
                    onUpdate('marginBell', val);
                    if (val) {
                      typewriterAudio.playMarginBell(
                        Math.max(settings.soundVolume, 55),
                        settings.soundTone,
                        settings.bellVariant
                      );
                    }
                  }}
                  label="Nyalakan bel margin"
                />
              </div>
            </section>
          </>
        )}

        {/* TAB 4: MIXER SUASANA BERLAPIS */}
        {activeTab === 'music' && (
          <>
            <section className="space-y-2.5">
              <div className="text-xs font-medium text-[#c5bbb0]">Racikan Suasana Cepat</div>
              <div className="grid grid-cols-2 gap-1.5">
                {AMBIENT_MIXER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onUpdate('ambientMixer', { ...preset.mixer })}
                    className="px-3 py-2 rounded-lg bg-[#141210] hover:bg-[#231e19] border border-white/8 hover:border-[#e6b873]/40 text-xs font-medium text-[#e9e1d5] text-left transition-colors whitespace-nowrap"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-[#c5bbb0]">Mixer Suasana Berlapis</div>
                <span className="text-[10.5px] text-[#8f8579]">Bisa digabung bersamaan</span>
              </div>

              <div className="space-y-4">
                {AMBIENT_CHANNELS.map((channel) => {
                  const val = settings.ambientMixer?.[channel.id] ?? 0;
                  return (
                    <div key={channel.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-medium text-[#ece5db]">{channel.name}</div>
                          <div className="text-[10.5px] text-[#8f8579]">{channel.description}</div>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-[#c7baa9] shrink-0">
                          {val === 0 ? 'Mati' : `${val}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(e) => {
                          const nextVal = Number(e.target.value);
                          const nextMixer = {
                            ...settings.ambientMixer,
                            [channel.id as AmbientChannelId]: nextVal,
                          };
                          onUpdate('ambientMixer', nextMixer);
                        }}
                        aria-label={`Volume ${channel.name}`}
                        className="aksara-slider"
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-3">
              <SliderControl
                label="Volume Utama Suasana"
                value={settings.ambientVolume}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onUpdate('ambientVolume', v)}
              />
            </section>
          </>
        )}

        {/* TAB 5: HURUF & TIPOGRAFI */}
        {activeTab === 'font' && (
          <>
            <section className="space-y-2.5">
              <div className="text-xs font-medium text-[#c5bbb0]">Gaya Huruf</div>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(FONT_PRESETS) as FontId[]).map((id) => {
                  const font = FONT_PRESETS[id];
                  const selected = settings.fontId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdate('fontId', id)}
                      className={`px-3.5 py-2.5 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                          : 'bg-[#141210] border-white/6 text-[#b0a699] hover:border-white/18'
                      }`}
                    >
                      <div className="text-xs font-semibold">{font.name}</div>
                      <div
                        className="text-sm text-[#d9d0c3] mt-1"
                        style={{ fontFamily: font.fontFamily }}
                      >
                        {font.sample}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-4">
              <SliderControl
                label="Ukuran Huruf"
                value={settings.fontSize}
                min={15}
                max={26}
                unit="px"
                onChange={(v) => onUpdate('fontSize', v)}
              />

              <SliderControl
                label="Kerapatan Antar Huruf"
                hint="Kiri lebih rapat, kanan lebih renggang (berlaku di semua mode)"
                value={settings.letterSpacing}
                min={-1}
                max={4}
                step={0.2}
                unit="px"
                displayValue={
                  Math.abs(settings.letterSpacing) < 0.05
                    ? 'Normal'
                    : `${settings.letterSpacing > 0 ? '+' : ''}${settings.letterSpacing.toFixed(1)} px`
                }
                onChange={(v) => onUpdate('letterSpacing', Number(v.toFixed(1)))}
              />

              <div className="space-y-2">
                <div className="text-xs font-medium text-[#c5bbb0]">Spasi Baris</div>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#110f0d]">
                  {(
                    [
                      { id: 'compact', label: 'Rapat' },
                      { id: 'normal', label: 'Normal' },
                      { id: 'relaxed', label: 'Lega' },
                    ] as { id: LineSpacingId; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdate('lineSpacing', opt.id)}
                      className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        settings.lineSpacing === opt.id
                          ? 'bg-[#2a241e] text-[#f3ca86]'
                          : 'text-[#9b9184] hover:text-[#e6dfd5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/8" />

              {/* Pengembangan Karakter Huruf Miring & Tidak Rata */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-[#c5bbb0]">
                    Karakter Huruf Miring & Ketukan Mesin
                  </div>
                  <p className="text-[11px] text-[#8f8579] leading-relaxed">
                    Mengatur kemiringan huruf, loncatan baseline, tekanan tinta, dan efek ketukan ganda halus.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {IMPERFECTION_PRESETS.map((preset) => {
                    const active = settings.imperfectionPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          onApplyPatch({
                            imperfectionPreset: preset.id as ImperfectionPresetId,
                            imperfectionIntensity: preset.defaultIntensity,
                          })
                        }
                        className={`px-3.5 py-2.5 rounded-lg border text-left transition-colors ${
                          active
                            ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                            : 'bg-[#141210] border-white/6 text-[#b0a699] hover:border-white/18'
                        }`}
                      >
                        <div className="text-xs font-semibold">{preset.name}</div>
                        <div className="text-[11px] text-[#91877b] mt-0.5">{preset.description}</div>
                      </button>
                    );
                  })}
                </div>

                <SliderControl
                  label="Intensitas Huruf Miring"
                  value={settings.imperfectionIntensity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => onUpdate('imperfectionIntensity', v)}
                />

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-xs font-medium text-[#ece5db]">Aktifkan Juga di Mode Standar</div>
                    <div className="text-[11px] text-[#91877b]">
                      Tampilkan huruf agak miring tanpa harus menyalakan Over-Realism
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.imperfectionInStandard}
                    onChange={(val) => onUpdate('imperfectionInStandard', val)}
                    label="Aktifkan huruf miring di Mode Standar"
                  />
                </div>
              </div>

              <div className="h-px bg-white/8" />

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs font-medium text-[#ece5db]">Redupkan Menu Saat Mengetik</div>
                  <div className="text-[11px] text-[#91877b]">Menjaga layar bersih tanpa gangguan</div>
                </div>
                <ToggleSwitch
                  checked={settings.autoFadeChrome}
                  onChange={(val) => onUpdate('autoFadeChrome', val)}
                  label="Redupkan menu saat mengetik"
                />
              </div>
            </section>
          </>
        )}
      </div>

      {/* Footer Reset */}
      <div className="px-5 pt-3.5 pb-2.5 border-t border-[#f5e6cf]/10 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs text-[#9e9487] hover:text-[#f5efe6] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Setelan Klasik</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#e6b873] text-[#17130f] text-xs font-semibold hover:bg-[#f0c888] transition-colors whitespace-nowrap"
          >
            Selesai
          </button>
        </div>
        <p className="text-center text-[9.5px] tracking-wide text-[#756b5f]/75 select-none">
          vibe coded by ipun
        </p>
      </div>
    </aside>
  );
};

interface SliderControlProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  displayValue?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit,
  displayValue,
  disabled = false,
  onChange,
}) => (
  <div className={`space-y-2 ${disabled ? 'opacity-45 pointer-events-none' : ''}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-[#ece5db]">{label}</span>
      <span className="text-xs text-[#c7baa9] font-mono tabular-nums">
        {displayValue ?? `${value}${unit}`}
      </span>
    </div>
    {hint && <p className="text-[11px] text-[#8f8579] leading-snug">{hint}</p>}
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="aksara-slider"
      aria-label={label}
    />
  </div>
);

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[#e6b873] ${
      checked ? 'bg-[#d9a75c]' : 'bg-[#342e29]'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-[#15120f] shadow transition-transform duration-150 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);
