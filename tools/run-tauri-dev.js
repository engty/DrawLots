#!/usr/bin/env node
const { spawn } = require('child_process');

const env = {
  ...process.env,
  TAURI_DEV_WATCHER_IGNORE: '../data/**'
};

const command = process.platform === 'win32' ? 'tauri.cmd' : 'tauri';

const child = spawn(command, ['dev', '--no-watch'], {
  stdio: 'inherit',
  env
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('启动 tauri 失败:', error);
  process.exit(1);
});
