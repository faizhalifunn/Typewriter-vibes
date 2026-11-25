import { spawnSync } from 'node:child_process';
import process from 'node:process';

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('[Aksara] 1/2 Membangun bundle offline untuk Electron...');
run('npx', ['vite', 'build'], {
  ...process.env,
  ELECTRON_BUILD: 'true',
});

console.log('[Aksara] 2/2 Mengemas file Windows .exe (Portable + Installer)...');
run('npx', ['--yes', 'electron-builder', '--win', 'portable', 'nsis', '--config', 'electron-builder.json']);

console.log('[Aksara] Selesai! File .exe tersedia di folder ./release');
