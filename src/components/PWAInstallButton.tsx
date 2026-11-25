import React, { useState } from 'react';
import { Download, MonitorDown, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { canPromptNatively, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (canPromptNatively) {
      const result = await promptInstall();
      if (result === 'unavailable') {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Pasang Aksara untuk penggunaan offline"
        title="Pasang sebagai aplikasi desktop offline"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#1e1a16]/90 text-[#e8d6bc] border border-[#e6b873]/28 hover:bg-[#2a241d] hover:border-[#e6b873]/50 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5 text-[#e6b873]" />
        <span className="hidden md:inline">Pasang Offline</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/68 backdrop-blur-sm p-4 no-print"
          onClick={() => setShowGuide(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="aksara-install-title"
        >
          <div
            className="w-full max-w-md rounded-xl bg-[#181411] border border-[#f5e6cf]/16 p-6 text-[#ece4d8] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-[#2a2219] border border-[#e6b873]/30 flex items-center justify-center text-[#e6b873] shrink-0">
                  <MonitorDown className="h-4 w-4" />
                </div>
                <div>
                  <h2 id="aksara-install-title" className="text-sm font-semibold text-[#faf3e8]">
                    Pasang Aksara di Perangkat Anda
                  </h2>
                  <p className="text-xs text-[#9c9184]">
                    Berjalan penuh tanpa koneksi internet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Tutup panduan pasang"
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-[#a3988b] hover:text-[#faf3e8] hover:bg-white/8 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-xs leading-relaxed text-[#cfc5b7]">
              {isIOS ? (
                <div className="rounded-lg bg-white/4 border border-white/8 p-3.5 space-y-1.5">
                  <p className="font-medium text-[#f4dfb9]">Untuk iPhone / iPad (Safari):</p>
                  <p>1. Ketuk tombol Bagikan (ikon kotak dengan panah ke atas).</p>
                  <p>2. Pilih &ldquo;Tambahkan ke Layar Utama&rdquo; lalu ketuk Tambah.</p>
                </div>
              ) : (
                <div className="rounded-lg bg-white/4 border border-white/8 p-3.5 space-y-1.5">
                  <p className="font-medium text-[#f4dfb9]">
                    Pasang Instan di Windows / Mac (Chrome atau Edge):
                  </p>
                  <p>
                    1. Klik ikon pemasangan di kanan bilah alamat browser, atau buka menu titik tiga
                    (⋮).
                  </p>
                  <p>
                    2. Pilih &ldquo;Pasang Aksara...&rdquo; / &ldquo;Install app&rdquo; untuk
                    menjadikannya aplikasi desktop mandiri yang bisa dibuka saat offline.
                  </p>
                </div>
              )}

              <div className="rounded-lg bg-white/4 border border-white/8 p-3.5 space-y-1.5">
                <p className="font-medium text-[#f4dfb9]">Atau Bangun File .exe Windows Mandiri:</p>
                <p>
                  Unduh proyek ini ke PC Windows Anda, lalu jalankan{' '}
                  <code className="px-1.5 py-0.5 rounded bg-black/50 text-[#f3ca86] font-mono text-[11px]">
                    npm install
                  </code>{' '}
                  dan{' '}
                  <code className="px-1.5 py-0.5 rounded bg-black/50 text-[#f3ca86] font-mono text-[11px]">
                    npm run build:exe
                  </code>{' '}
                  untuk menghasilkan <span className="text-[#faf3e8]">Aksara.exe</span>.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-lg bg-[#e6b873] text-[#17130f] text-xs font-semibold hover:bg-[#f0c684] transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-30 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#171411]/90 border border-[#e6b873]/28 text-[11px] text-[#e8d6bc] backdrop-blur-md shadow-lg no-print"
    >
      <WifiOff className="h-3.5 w-3.5 text-[#e6b873]" />
      <span>Mode Offline — Aksara berjalan lokal di perangkat Anda</span>
    </div>
  );
};
