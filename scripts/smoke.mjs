import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import ffmpeg from 'ffmpeg-static';

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const directory = new URL('../test-results/', import.meta.url); await mkdir(directory, { recursive: true });
const photo = await sharp({ create: { width: 720, height: 960, channels: 3, background: '#dce7ff' } }).composite([{ input: Buffer.from('<svg width="720" height="960"><rect x="180" y="140" width="360" height="620" rx="25" fill="#3063ed"/><circle cx="360" cy="180" r="80" fill="#dce7ff"/></svg>') }]).jpeg().toBuffer();
const cover = await sharp({ create: { width: 960, height: 720, channels: 3, background: '#ead1ba' } }).composite([{ input: Buffer.from('<svg width="960" height="720"><path d="M330 100h300l80 170-80 30 90 300H240l90-300-80-30Z" fill="#9b5e3f"/><path d="M390 170v360m180-360v360" stroke="#dfb991" stroke-width="10"/></svg>') }]).jpeg().toBuffer();
const profile = { owner: 'Profil de test', name: 'Atelier de test <script>', job: 'Couturière', city: 'Lomé, Agoè', phone: '+228 90000000', services: 'Retouches\nRobes sur mesure', extra: 'Sur rendez-vous.', tagline: 'Des créations pour raconter votre histoire.', availability: 'Sur rendez-vous.', experience: 'Parcours fictif utilisé uniquement pour ce test.', coverId: 'cover-test', bio: 'Je suis couturière à Lomé. Je propose des retouches et des robes sur mesure.', works: [{ id: 'test', title: 'Illustration de test', description: 'Illustration synthétique, aucune réalisation réelle.', image: `data:image/jpeg;base64,${photo.toString('base64')}` }, { id: 'cover-test', title: 'La couverture de test', description: 'Cette illustration sert à vérifier le choix de la couverture.', image: `data:image/jpeg;base64,${cover.toString('base64')}` }], validated: true, showContact: false };
// A browser sends Origin on these requests. Omitting it previously hid a real 403 bug.
const post = (url, body, headers = {}) => fetch(`${base}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(base).origin, ...headers }, body: JSON.stringify(body) });
const errorText = async response => response.ok ? '' : await response.clone().text();
let cookie = ''; let publicPath = ''; let checks = 0;
function ok(label) { checks++; console.log(`✓ ${label}`); }
try {
  for (const url of ['/', '/manifest.webmanifest', '/sw.js', '/icon-192.png', '/icon-512.png']) assert.equal((await fetch(base + url)).status, 200, url);
  const manifest = await (await fetch(base + '/manifest.webmanifest')).json(); assert.equal(manifest.theme_color, '#3063ed'); assert.equal(manifest.display, 'standalone'); ok('Application et ressources PWA accessibles');
  const health = await (await fetch(base + '/api/health')).json(); console.log(`Services : voix=${health.voice}, assistant=${health.assistant}, stockage=${health.storage}`);
  let r = await post('/api/export/pdf', { ...profile, validated: false }); assert.equal(r.status, 400); ok('Export impossible sans validation');
  r = await post('/api/export/pdf', { ...profile, works: [{ ...profile.works[0], image: 'javascript:alert(1)' }] }); assert.equal(r.status, 400); ok('Sources image invalides rejetées');
  r = await post('/api/export/pdf', profile, { Origin: 'https://untrusted.example' }); assert.equal(r.status, 403); ok('Autre origine refusée');
  // Same-server requests must work through the alias too, with a real browser Origin header.
  if (['localhost', '127.0.0.1'].includes(new URL(base).hostname)) {
    const alias = new URL(base); alias.hostname = alias.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    r = await fetch(new URL('/api/export/pdf', alias), { method: 'POST', headers: { Origin: alias.origin, 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(r.status, 400); ok('Origine navigateur acceptée sur localhost et son alias (pas de faux 403)');
  }
  r = await post('/api/export/pdf', profile); assert.equal(r.status, 200, await errorText(r)); const pdf = Buffer.from(await r.arrayBuffer()); assert.equal(pdf.subarray(0, 5).toString(), '%PDF-'); const document = await PDFDocument.load(pdf); assert(document.getPageCount() >= 1); await writeFile(new URL('portfolio-test.pdf', directory), pdf); ok(`PDF généré et ouvert (${document.getPageCount()} pages)`);
  const legacy = { ...profile }; for (const key of ['tagline', 'availability', 'experience', 'coverId']) delete legacy[key];
  legacy.works = legacy.works.map(({ description, ...work }) => work);
  r = await post('/api/export/pdf', legacy); assert.equal(r.status, 200, await errorText(r)); await PDFDocument.load(await r.arrayBuffer()); ok('Brouillons existants compatibles, sans les nouveaux champs facultatifs');
  r = await post('/api/export/mp4', profile); assert.equal(r.status, 200, await errorText(r)); const video = Buffer.from(await r.arrayBuffer()); assert.equal(video.subarray(4, 8).toString(), 'ftyp'); const videoPath = new URL('portfolio-test.mp4', directory); await writeFile(videoPath, video);
  await new Promise((resolve, reject) => { const child = spawn(ffmpeg, ['-v', 'error', '-i', fileURLToPath(videoPath), '-f', 'null', '-'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); let error = ''; child.stderr.on('data', data => { error += data; }); child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(error))); }); ok('MP4 généré et décodé par FFmpeg');
  r = await post('/api/portfolio', { profile, consent: false }); assert.equal(r.status, 400); ok('Publication impossible sans accord');
  r = await post('/api/portfolio', { profile, consent: true }); assert.equal(r.status, 201, await errorText(r)); const data = await r.json(); publicPath = data.path; cookie = r.headers.get('set-cookie')?.split(';')[0] || ''; assert(cookie); assert(/httponly/i.test(r.headers.get('set-cookie'))); ok('Page enregistrée et accès privé par cookie');
  r = await fetch(base + publicPath); assert.equal(r.status, 200); const html = await r.text(); assert(html.includes('Atelier de test')); assert(!html.includes(profile.phone)); assert(!html.includes('<script>alert')); assert(html.includes(profile.tagline)); assert(html.includes('Sur rendez-vous.')); assert(html.includes('og:title')); assert(html.includes('og:image')); ok('Identité enrichie et métadonnées présentes, téléphone masqué, contenu échappé');
  r = await fetch(base + publicPath + '/opengraph-image'); assert.equal(r.status, 200, await errorText(r)); const socialImage = Buffer.from(await r.arrayBuffer()); const socialSize = await sharp(socialImage).metadata(); assert.equal(socialSize.width, 1200); assert.equal(socialSize.height, 630); await writeFile(new URL('partage-test.png', directory), socialImage); ok('Aperçu de partage PNG généré (1200 × 630)');
  r = await fetch(base + '/api/portfolio', { method: 'DELETE', headers: { Origin: new URL(base).origin } }); assert.equal(r.status, 401); ok('Retrait sans accès privé refusé');
  r = await fetch(base + '/api/portfolio', { headers: { Cookie: cookie } }); assert.equal((await r.json()).id, data.id); ok('Accès de gestion retrouvé');
  r = await post('/api/assistant', { ...profile, works: [] }); assert.equal(r.status, 200); const assistant = await r.json(); assert.equal(typeof assistant.bio, 'string'); assert(['qwen', 'template'].includes(assistant.source)); ok(`Présentation préparée, source réelle : ${assistant.source}`);
  if (health.voice === 'ready') {
    try { const audio = await readFile(new URL('reponse-francaise.wav', directory)); const form = new FormData(); form.append('audio', new Blob([audio], { type: 'audio/wav' }), 'test.wav'); r = await fetch(base + '/api/transcribe', { method: 'POST', body: form }); assert.equal(r.status, 200, await errorText(r)); const transcription = await r.json(); assert.match(transcription.text, /Lom[eé]/i); assert.match(transcription.text, /retouches/i); console.log(`Transcription synthétique : ${transcription.text}`); ok('Whisper transcrit un audio français (localisation et prestation reconnues ; fidélité terrain non évaluée)'); }
    catch (error) { if (error.code === 'ENOENT') console.log('Audio français absent : test ignoré.'); else throw error; }
  }
  console.log(`\n${checks} contrôles réussis. Rendu et micro mobile à vérifier dans un navigateur.`);
} finally {
  if (cookie) { const r = await fetch(base + '/api/portfolio', { method: 'DELETE', headers: { Cookie: cookie, Origin: new URL(base).origin } }); assert.equal(r.status, 200); assert.equal((await fetch(base + publicPath)).status, 404); console.log('✓ Page de test retirée et devenue inaccessible'); }
}
