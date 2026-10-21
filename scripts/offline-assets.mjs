import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
async function files(folder) { const entries = await readdir(folder, { withFileTypes: true }); const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(folder, entry.name)) : [path.join(folder, entry.name)])); return nested.flat(); }
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
const staticFiles = await files('.next/static');
const assets = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable.png', '/fonts/dm-sans.ttf', ...staticFiles.filter(file => !file.endsWith('.map')).map(file => '/_next/static/' + path.relative('.next/static', file).split(path.sep).map(encodeURIComponent).join('/'))];
const source = await readFile('src/workers/service-worker.js', 'utf8');
await writeFile('public/sw.js', source.replace('__BUILD_ID__', buildId).replace('__ASSETS__', JSON.stringify(assets)), 'utf8');
await writeFile('public/offline-assets.json', JSON.stringify({ buildId, assets }), 'utf8');
console.log(`PWA : ${assets.length} ressources préparées, dont les workers et leurs dépendances.`);
