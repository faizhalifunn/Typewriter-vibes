const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 540,
    title: 'Aksara — Ruang Mengetik Klasik',
    backgroundColor: '#14110e',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'pwa-512x512.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load local offline production bundle directly from dist/index.html
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
