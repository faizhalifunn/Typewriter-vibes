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
  AMBIENT_TRACKS,
  BELL_VARIANTS,
  FONT_PRESETS,
  MOOD_PRESETS,
  PAPER_PRESETS,
  SOUND_PROFILES,
  STAMP_STYLES,
  temperatureToLightColors,
} from '../constants/presets';
import { typewriterAudio } from '../audio/typewriterAudio';
import type {
  BellVariantId,
  EditorSettings,
  FontId,
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
  onUpdate: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  onApplyPatch: (patch: Partial<EditorSettings>) => void;
  onReset: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
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
                  ? 'Tinta permanen tanpa hapus. Panah menggeser gulungan secara bebas tanpa snap otomatis, dengan kunci margin dan pita hitam/merah.'
                  : 'Suntingan bebas dengan rasa mesin ketik klasik serta batas margin kiri dan kanan yang dapat diatur.'}
              </p>

              {settings.typingMode === 'over_realism' && (
                <div className="pt-2 space-y-1.5 border-t border-white/8">
                  <div className="text-xs font-medium text-[#c5bbb0]">Pita Tinta (Bichrome)</div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#110f0d]">
                    {(
                      [
                        { id: 'black', label: 'Pita Hitam' },
                        { id: 'red', label: 'Pita Merah' },
                      ] as { id: RibbonColorId; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdate('ribbonColor', opt.id)}
                        className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          settings.ribbonColor === opt.id
                            ? opt.id === 'red'
                              ? 'bg-[#361b18] text-[#f08b7e]'
                              : 'bg-[#2a241e] text-[#f3ca86]'
                            : 'text-[#9b9184] hover:text-[#e6dfd5]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
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

              {/* Margin Kiri & Kanan berlaku untuk Mode Standar maupun Over-Realism */}
              <div className="pt-2 space-y-3 border-t border-white/8">
                <SliderControl
                  label="Margin Kiri"
                  value={settings.marginLeft}
                  min={0}
                  max={Math.max(0, settings.marginRight - 18)}
                  unit=" kol"
                  onChange={(v) => onUpdate('marginLeft', v)}
                />

                <SliderControl
                  label="Margin Kanan"
                  value={settings.marginRight}
                  min={Math.min(72, settings.marginLeft + 18)}
                  max={74}
                  unit=" kol"
                  onChange={(v) => onUpdate('marginRight', v)}
                />
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

            <section className="space-y-2.5">
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
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-2.5">
              <div className="text-xs font-medium text-[#c5bbb0]">Tekstur Kertas</div>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(PAPER_PRESETS) as PaperTextureId[]).map((id) => {
                  const preset = PAPER_PRESETS[id];
                  const selected = settings.paperTexture === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdate('paperTexture', id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                          : 'bg-[#141210] border-white/6 text-[#b0a699] hover:border-white/18'
                      }`}
                    >
                      <div
                        className="h-10 w-10 rounded-md shrink-0 border border-black/25 overflow-hidden"
                        style={{
                          backgroundColor: preset.swatchStyle,
                          backgroundImage: preset.imageUrl ? `url(${preset.imageUrl})` : undefined,
                          backgroundSize: 'cover',
                          filter: preset.imageFilter,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{preset.name}</div>
                        <div className="text-[11px] text-[#91877b] truncate">{preset.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
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

              <div className="space-y-2 pt-1">
                <div className="text-xs font-medium text-[#c5bbb0]">Stempel Karet Tanggal</div>
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

        {/* TAB 4: MUSIK LATAR */}
        {activeTab === 'music' && (
          <>
            <section className="space-y-2.5">
              <div className="text-xs font-medium text-[#c5bbb0]">Suasana & Musik Latar</div>
              <div className="grid grid-cols-1 gap-1.5">
                {AMBIENT_TRACKS.map((track) => {
                  const selected = settings.ambientTrack === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => onUpdate('ambientTrack', track.id)}
                      className={`px-3.5 py-2.5 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'bg-[#2a231c] border-[#e6b873]/55 text-[#f6efe6]'
                          : 'bg-[#141210] border-white/6 text-[#b0a699] hover:border-white/18'
                      }`}
                    >
                      <div className="text-xs font-semibold">{track.name}</div>
                      <div className="text-[11px] text-[#91877b] mt-0.5">{track.description}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="h-px bg-white/8" />

            <section className="space-y-4">
              <SliderControl
                label="Volume Musik Latar"
                value={settings.ambientVolume}
                min={0}
                max={100}
                unit="%"
                disabled={settings.ambientTrack === 'off'}
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
