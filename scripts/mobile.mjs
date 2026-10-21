// One local production app behind a temporary, trusted HTTPS Cloudflare tunnel.
import { createHash } from 'node:crypto';
import { existsSync, createWriteStream } from 'node:fs';
import { mkdir, rename } from 'node:fs/promises';
import { createServer } from 'node:net';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url)); const tools = path.join(root, '.tools');
await mkdir(tools, { recursive: true });
const binary = process.platform === 'win32' ? path.join(tools, 'cloudflared.exe') : 'cloudflared';
if (process.platform === 'win32' && !existsSync(binary)) {
  const release = await fetch('https://api.github.com/repos/cloudflare/cloudflared/releases/latest').then(r => { if (!r.ok) throw new Error('La distribution officielle Cloudflare est indisponible.'); return r.json(); });
  const asset = release.assets.find(asset => asset.name === 'cloudflared-windows-amd64.exe');
  if (!asset) throw new Error('Distribution Windows officielle introuvable.');
  console.log('Téléchargement de Cloudflare depuis son dépôt officiel…');
  const response = await fetch(asset.browser_download_url); if (!response.ok || !response.body) throw new Error('Le téléchargement a échoué.');
  const hash = createHash('sha256');
  await pipeline(Readable.fromWeb(response.body), new Transform({ transform(chunk, _, next) { hash.update(chunk); next(null, chunk); } }), createWriteStream(binary + '.part'));
  if (asset.digest && `sha256:${hash.digest('hex')}` !== asset.digest) throw new Error('Le contrôle du téléchargement a échoué.');
  await rename(binary + '.part', binary);
}
function free(port) { return new Promise(resolve => { const server = createServer(); server.once('error', () => resolve(false)); server.listen(port, '127.0.0.1', () => server.close(() => resolve(true))); }); }
let port = 3001; while (!(await free(port))) { port++; if (port > 3020) throw new Error('Aucun port disponible pour le test mobile.'); }
const children = []; let stopping = false;
function stop() {
  if (stopping) return; stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', stop); process.on('SIGTERM', stop);
const tunnel = spawn(binary, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate', '--protocol', 'http2'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); children.push(tunnel);
const url = await new Promise((resolve, reject) => {
  let output = ''; const timer = setTimeout(() => reject(new Error('Cloudflare n’a pas fourni de lien. Vérifiez la connexion.')), 45000);
  const read = chunk => { output = (output + chunk.toString()).slice(-12000); const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/); if (match) { clearTimeout(timer); resolve(match[0]); } };
  tunnel.stdout.on('data', read); tunnel.stderr.on('data', read); tunnel.on('error', error => { clearTimeout(timer); reject(error); }); tunnel.on('exit', code => { clearTimeout(timer); if (!stopping) reject(new Error(`Le tunnel s’est arrêté (${code}).`)); });
}).catch(error => { console.error(error.message); stop(); return null; });
if (url) {
  console.log(`\nAdresse mobile HTTPS : ${url}\nLa PWA démarre. Attendez le message « Ready », puis ouvrez ce lien sur le téléphone.\nLes données transitent par Cloudflare. Ctrl+C arrête ce lien temporaire.\n`);
  const app = spawn(process.execPath, ['scripts/demo.mjs', '--offline'], { cwd: root, env: { ...process.env, PORT: String(port), APP_ORIGIN: url }, windowsHide: true, stdio: 'inherit' }); children.push(app);
  app.on('error', error => { console.error(error.message); stop(); }); app.on('exit', () => stop());
}
