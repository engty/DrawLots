#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

async function cleanDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function copyItem(src, dest) {
  try {
    const stat = await fs.stat(src);
    if (stat.isDirectory()) {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src);
      for (const entry of entries) {
        await copyItem(path.join(src, entry), path.join(dest, entry));
      }
    } else {
      await fs.copyFile(src, dest);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

(async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');
  const itemsToCopy = ['index.html', 'styles', 'scripts', 'data', 'icons'];

  await cleanDir(distDir);

  for (const item of itemsToCopy) {
    const src = path.join(projectRoot, item);
    const dest = path.join(distDir, item);
    await copyItem(src, dest);
  }

  console.log('[prepare-static] 静态资源已复制到 dist/');
})();
