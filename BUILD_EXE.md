# Panduan Membangun File `Aksara.exe` (Offline Windows)

Aksara dapat dijalankan sepenuhnya secara offline dengan dua cara:

## Cara 1 — Langsung Tanpa Build (Aplikasi Desktop PWA)
1. Buka tautan web Aksara di **Google Chrome** atau **Microsoft Edge**.
2. Klik tombol **Pasang Offline** di sudut kanan atas (atau ikon install di bilah alamat browser).
3. Aksara akan terpasang sebagai aplikasi desktop mandiri yang bisa dibuka dari Start Menu / Desktop tanpa koneksi internet.

---

## Cara 2 — Build File `Aksara.exe` Mandiri (Electron)
Pastikan **Node.js 20+** sudah terpasang di PC Windows Anda, lalu jalankan perintah berikut di dalam folder proyek:

```bash
npm install
npm install -D electron electron-builder
npm run build:exe
```

Setelah selesai, hasil file `.exe` offline akan muncul di folder `release/`:
- `Aksara-portable.exe` — langsung klik dua kali tanpa perlu instalasi.
- `Aksara-nsis.exe` — installer standar Windows dengan pintasan Desktop & Start Menu.
