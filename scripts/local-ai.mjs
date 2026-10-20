// Petit moteur CPU portable pour Windows, sans installation système ni API payante.
import { createHash } from 'node:crypto';
import { existsSync, createWriteStream } from 'node:fs';
import { mkdir, rename } from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') throw new Error('Ce lanceur portable vise Windows. Sous Linux/macOS, utilisez Ollama ou le service Docker du README.');
const root = fileURLToPath(new URL('../.models/local-ai/', import.meta.url));
const runtime = path.join(root, 'runtime'); const model = path.join(root, 'Qwen3-0.6B-Q8_0.gguf');
await mkdir(runtime, { recursive: true });
async function json(url) { const response = await fetch(url); if (!response.ok) throw new Error(`Téléchargement indisponible (${response.status}).`); return response.json(); }
async function download(url, filename, expectedHash) {
  if (existsSync(filename)) return;
  const response = await fetch(url); if (!response.ok || !response.body) throw new Error(`Téléchargement indisponible (${response.status}).`);
  const total = Number(response.headers.get('content-length')); let size = 0; let last = 0; const hash = createHash('sha256');
  console.log(`Téléchargement : ${path.basename(filename)}${total ? ` (${Math.round(total / 1024 ** 2)} Mo)` : ''}`);
  await pipeline(Readable.fromWeb(response.body), new Transform({ transform(chunk, _, done) { size += chunk.length; hash.update(chunk); if (size - last > 50 * 1024 ** 2) { last = size; console.log(`${Math.round(size / 1024 ** 2)} Mo téléchargés…`); } done(null, chunk); } }), createWriteStream(filename + '.part'));
  if (total && size !== total) throw new Error('Téléchargement incomplet. Relancez la commande.');
  if (expectedHash && hash.digest('hex') !== expectedHash) throw new Error('Le contrôle SHA-256 du téléchargement a échoué.');
  await rename(filename + '.part', filename);
}
async function run(command, args, options = {}) { return new Promise((resolve, reject) => { const child = spawn(command, args, { stdio: 'inherit', windowsHide: true, ...options }); child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`${command} a quitté avec le code ${code}`))); }); }
const executable = path.join(runtime, 'llama-server.exe');
if (!existsSync(executable)) {
  const release = await json('https://api.github.com/repos/ggml-org/llama.cpp/releases/tags/b11756');
  const asset = release.assets.find(item => item.name.endsWith('bin-win-cpu-x64.zip'));
  if (!asset) throw new Error('Distribution CPU officielle introuvable.');
  const archive = path.join(root, 'runtime.zip'); await download(asset.browser_download_url, archive, asset.digest?.replace('sha256:', ''));
  await run('powershell.exe', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory($env:TP_ARCHIVE, $env:TP_RUNTIME)'], { env: { ...process.env, TP_ARCHIVE: archive, TP_RUNTIME: runtime } });
}
if (!existsSync(model)) {
  const metadata = await json('https://huggingface.co/api/models/Qwen/Qwen3-0.6B-GGUF?blobs=true');
  const entry = metadata.siblings.find(item => item.rfilename === 'Qwen3-0.6B-Q8_0.gguf');
  await download('https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf', model, entry?.lfs?.sha256);
}
console.log('Démarrage de Qwen3 sur http://127.0.0.1:8081. Laissez ce terminal ouvert.');
await run(executable, ['-m', model, '--host', '127.0.0.1', '--port', '8081', '-c', '2048', '-t', '2', '--parallel', '1', '--jinja', '--chat-template-kwargs', '{"enable_thinking":false}', '--no-warmup']);
