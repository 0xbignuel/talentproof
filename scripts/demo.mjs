import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const children = [];
const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const env = { ...process.env, ALLOW_LOCAL_STORAGE: 'true', LLAMA_URL: process.env.LLAMA_URL || 'http://127.0.0.1:8081' };
// Next supplies its environment loader; secrets remain in the process, never printed.
const { default: { loadEnvConfig } } = await import('@next/env'); loadEnvConfig(root); Object.assign(env, process.env);
env.ALLOW_LOCAL_STORAGE = 'true'; env.LLAMA_URL ||= 'http://127.0.0.1:8081';
function start(command, args) {
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit', windowsHide: true }); children.push(child);
  child.on('error', error => console.error(`Impossible de démarrer un service : ${error.message}`)); return child;
}
async function running(url) { try { return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; } }
function available(port) { return new Promise(resolve => { const server = createServer(); server.once('error', () => resolve(false)); server.listen(port, '0.0.0.0', () => server.close(() => resolve(true))); }); }
if (!(await running('http://127.0.0.1:8000/health'))) {
  if (existsSync(python)) start(python, ['services/voice/server.py']);
  else console.log('Whisper non installé. Consultez le README ; la dictée du navigateur reste disponible selon sa compatibilité.');
}
if (!(await running(env.LLAMA_URL + '/health')) && process.platform === 'win32') start(process.execPath, ['scripts/local-ai.mjs']);
let existingPort = 0;
if (existsSync(path.join(root, '.next', 'dev', 'lock'))) {
  for (let candidate = 3000; candidate <= 3020; candidate++) {
    try { const response = await fetch(`http://localhost:${candidate}/api/health`, { signal: AbortSignal.timeout(500) }); const status = await response.json(); if (response.ok && 'voice' in status && 'assistant' in status && 'storage' in status) { existingPort = candidate; break; } } catch {}
  }
}
let port = existingPort || Number(process.env.PORT || 3000);
if (!existingPort) {
  while (!(await available(port))) { port++; if (port > 3020) throw new Error('Aucun port disponible entre 3000 et 3020.'); }
  start(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', '--port', String(port)]);
}
console.log(`\nTalentProof : http://localhost:${port}${existingPort ? ' (serveur déjà démarré)' : ''}\nGardez ce terminal ouvert si des services y démarrent. Ctrl+C pour les arrêter.\n`);
let stopping = false;
function stop() {
  if (stopping) return; stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', stop); process.on('SIGTERM', stop);
