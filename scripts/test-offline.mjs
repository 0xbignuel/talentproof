import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const require = createRequire(import.meta.url);
const base = process.env.TEST_BASE_URL || 'http://localhost:3001';
const code = await readFile('public/sw.js', 'utf8');
assert(!code.includes('__ASSETS__')); assert(!code.includes('__BUILD_ID__'));
const handlers = {}; const databases = new Map(); let offline = false; let backendDown = false;
const cacheApi = {
  async open(name) {
    if (!databases.has(name)) databases.set(name, new Map()); const items = databases.get(name);
    return {
      async addAll(paths) { await Promise.all(paths.map(async path => { const response = await fetch(new URL(path, base)); assert.equal(response.status, 200, path); items.set(path, response.clone()); })); },
      async put(path, response) { items.set(path, response.clone()); },
      async match(path) { return items.get(path)?.clone(); },
    };
  },
  async keys() { return [...databases.keys()]; },
  async delete(name) { return databases.delete(name); },
  async match(path) { for (const cache of databases.values()) if (cache.has(path)) return cache.get(path).clone(); },
};
vm.runInNewContext(code, { self: { addEventListener: (event, handler) => { handlers[event] = handler; }, skipWaiting: async () => {}, clients: { claim: async () => {} }, location: { origin: new URL(base).origin } }, caches: cacheApi, URL, Response, AbortController, setTimeout, clearTimeout, fetch: async (request, options) => { if (offline) throw new Error('Network offline'); if (backendDown) return new Response('Unavailable', { status: 502 }); return fetch(new URL(typeof request === 'string' ? request : request.url, base), options); } });
let pending; handlers.install({ waitUntil: task => { pending = task; } }); await pending;
databases.set('unrelated-cache', new Map()); databases.set('talentproof-old', new Map()); handlers.activate({ waitUntil: task => { pending = task; } }); await pending;
assert(databases.has('unrelated-cache')); assert(!databases.has('talentproof-old')); console.log('✓ Installation : toutes les ressources répondent, nettoyage limité au cache TalentProof');
offline = true;
let response;
handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: base + '/' }, respondWith: task => { response = task; } });
assert.equal((await response).status, 200); console.log('✓ Interface retrouvée dans le cache sans aucun accès réseau');
offline = false; backendDown = true;
handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: base + '/' }, respondWith: task => { response = task; } }); assert.equal((await response).status, 200); console.log('✓ Interface retrouvée lorsque le serveur ou le tunnel renvoie 502');
offline = true; backendDown = false;
const { assets } = JSON.parse(await readFile('public/offline-assets.json', 'utf8')); const script = assets.find(path => path.startsWith('/_next/static/') && path.endsWith('.js'));
handlers.fetch({ request: { method: 'GET', mode: 'cors', url: base + script }, respondWith: task => { response = task; } }); assert.equal((await response).status, 200); console.log('✓ Scripts disponibles sans réseau (précache complet, workers inclus)');
for (const path of ['/api/portfolio', '/api/transcribe', '/p/test']) { let intercepted = false; handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: base + path }, respondWith: () => { intercepted = true; } }); assert.equal(intercepted, false); }
console.log('✓ API, pages publiques et données personnelles exclues du cache');

async function loadTs(file, dependencies = {}) {
  const exports = {}; const source = await readFile(file, 'utf8'); const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  // Same JS realm as pdf-lib: its Array checks reject arrays from a separate VM realm.
  new Function('exports', 'require', 'fetch', compiled)(exports, name => dependencies[name] || require(name), () => { throw new Error('Network prohibited for this test'); }); return exports;
}
const portfolio = await loadTs('src/lib/portfolio.ts'); const { localPdf } = await loadTs('src/lib/local-pdf.ts', { './portfolio': portfolio });
const jpg = await sharp({ create: { width: 600, height: 900, channels: 3, background: '#3063ed' } }).jpeg().toBuffer();
const profile = { ...portfolio.emptyProfile, owner: 'Profil synthétique', name: 'Atelier hors connexion', job: 'Couturière', city: 'Lomé', services: 'Retouches\nTenues sur mesure', bio: 'Présentation synthétique pour vérifier le PDF local.', phone: '+228 90000000', showContact: false, validated: true, works: [{ id: 'offline-test', title: 'Illustration de test', image: `data:image/jpeg;base64,${jpg.toString('base64')}` }] };
const bytes = await localPdf(profile); const pdf = await PDFDocument.load(bytes); assert(pdf.getPageCount() >= 2); await mkdir('test-results', { recursive: true }); await writeFile('test-results/offline-portfolio.pdf', bytes); console.log(`✓ PDF créé hors réseau et ouvert (${pdf.getPageCount()} pages)`);
await assert.rejects(() => localPdf({ ...profile, validated: false })); console.log('✓ Le PDF local respecte la validation du récapitulatif');
const { microphoneError, insecureMicrophoneMessage } = await loadTs('src/lib/microphone.ts'); assert(insecureMicrophoneMessage.includes('HTTPS')); assert(microphoneError({ name: 'NotAllowedError' }).includes('réglages')); assert(microphoneError({ name: 'NotReadableError' }).includes('autre application')); console.log('✓ Explications distinctes : HTTP, permission et micro déjà utilisé');
console.log('Tests exécutés hors navigateur : installation réelle sur téléphone, IndexedDB et permission micro restent à vérifier sur l’appareil.');
