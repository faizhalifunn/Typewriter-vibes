import React from 'react';
import { Camera, Copy, Download, FilePlus2, Printer, Quote, Trash2, X } from 'lucide-react';
import { realismStrokesToPlainText } from '../utils/paperExporter';
import type { DocumentSheet } from '../types';

interface SheetsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: DocumentSheet[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onCreateSheet: () => void;
  onDeleteSheet: (id: string) => void;
  onExportPaperPng: () => void;
  onOpenQuoteModal: () => void;
  isExportingPng: boolean;
  photoSaved: boolean;
  onExportTxt: () => void;
  onCopyText: () => void;
  onPrint: () => void;
  copied: boolean;
  isOverRealism: boolean;
  charWidth: number;
  lineHeightPx: number;
}

export const SheetsPopover: React.FC<SheetsPopoverProps> = ({
  isOpen,
  onClose,
  sheets,
  activeSheetId,
  onSelectSheet,
  onCreateSheet,
  onDeleteSheet,
  onExportPaperPng,
  onOpenQuoteModal,
  isExportingPng,
  photoSaved,
  onExportTxt,
  onCopyText,
  onPrint,
  copied,
  isOverRealism,
  charWidth,
  lineHeightPx,
}) => {
  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ts));
    } catch {
      return '';
    }
  };

  return (
    <aside
      aria-label="Lembar Naskah"
      className="fixed left-4 top-16 bottom-4 z-40 w-[310px] max-w-[calc(100vw-2rem)] flex flex-col rounded-xl bg-[#191614]/92 text-[#ebe5db] border border-[#f5e6cf]/12 shadow-2xl backdrop-blur-xl no-print"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5e6cf]/10">
        <h2 className="text-sm font-semibold tracking-tight text-[#f5efe6]">Lembar Naskah</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup daftar lembar"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#a89f93] hover:text-[#f5efe6] hover:bg-white/6 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Primary Action: New Sheet */}
      <div className="p-4 border-b border-[#f5e6cf]/8">
        <button
          type="button"
          onClick={onCreateSheet}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#2a231c] hover:bg-[#352c23] border border-[#e6b873]/30 text-xs font-semibold text-[#f3ca86] transition-colors whitespace-nowrap"
        >
          <FilePlus2 className="h-4 w-4" />
          <span>Lembar Kertas Baru</span>
        </button>
      </div>

      {/* Saved Sheets List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 aksara-scroll">
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          const plain =
            isOverRealism && sheet.realismStrokes
              ? realismStrokesToPlainText(sheet.realismStrokes, charWidth, lineHeightPx)
              : sheet.content;
          const wordCount = plain.trim() ? plain.trim().split(/\s+/).length : 0;
          return (
            <div
              key={sheet.id}
              className={`group flex items-start justify-between gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                isActive
                  ? 'bg-[#2a231c] border-[#e6b873]/45 text-[#f6efe6]'
                  : 'bg-transparent border-transparent hover:bg-white/4 text-[#bfb6a9]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectSheet(sheet.id);
                  onClose();
                }}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-xs font-semibold truncate">
                  {sheet.title.trim() || 'Tanpa Judul'}
                </div>
                <div className="text-[11px] text-[#8d8377] mt-0.5 tabular-nums">
                  {wordCount} kata · {formatDate(sheet.updatedAt)}
                </div>
              </button>
              {sheets.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteSheet(sheet.id)}
                  aria-label={`Hapus ${sheet.title || 'naskah'}`}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 h-7 w-7 inline-flex items-center justify-center rounded-md text-[#9a8e80] hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Export / Print Actions */}
      <div className="p-4 border-t border-[#f5e6cf]/10 space-y-2.5">
        <div className="text-[11px] font-medium text-[#91877b]">Unduh & Bagikan Lembar Aktif</div>

        {/* Highlighted Styled Paper Photo Download */}
        <button
          type="button"
          onClick={onExportPaperPng}
          disabled={isExportingPng}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#e6b873] hover:bg-[#f0c888] disabled:opacity-60 text-[#17130f] text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Camera className="h-4 w-4" />
          <span>
            {isExportingPng
              ? 'Menyimpan Foto...'
              : photoSaved
                ? 'Foto Tersimpan'
                : 'Simpan sebagai Foto (.png)'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenQuoteModal();
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#2a231c] hover:bg-[#352c23] border border-[#e6b873]/30 text-[#f3ca86] text-xs font-medium transition-colors whitespace-nowrap"
        >
          <Quote className="h-3.5 w-3.5" />
          <span>Buat Kartu Kutipan</span>
        </button>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onCopyText}
            className="inline-flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg bg-[#141210] hover:bg-[#231f1b] border border-white/8 text-[11px] text-[#d9d0c3] transition-colors whitespace-nowrap"
          >
            <Copy className="h-3.5 w-3.5 text-[#e6b873]" />
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
          <button
            type="button"
            onClick={onExportTxt}
            className="inline-flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg bg-[#141210] hover:bg-[#231f1b] border border-white/8 text-[11px] text-[#d9d0c3] transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 text-[#e6b873]" />
            <span>Unduh .txt</span>
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg bg-[#141210] hover:bg-[#231f1b] border border-white/8 text-[11px] text-[#d9d0c3] transition-colors whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5 text-[#e6b873]" />
            <span>Cetak</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
