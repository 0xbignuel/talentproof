import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

const base = process.env.TEST_BASE_URL || 'http://localhost:3001';
const directory = path.resolve('test-results');
await mkdir(directory, { recursive: true });
const image = await sharp({ create: { width: 360, height: 480, channels: 3, background: '#dce7ff' } }).jpeg().toBuffer();
const profile = { owner: '', name: 'Atelier de test', job: 'Couturière', city: 'Lomé', phone: '', services: 'Retouches', extra: '', bio: 'Je propose des retouches à Lomé.', validated: true, showContact: false, works: [{ id: 'test', title: 'Illustration de test', image: `data:image/jpeg;base64,${image.toString('base64')}` }] };
const post = body => fetch(base + '/api/export/mp4', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.TEST_ORIGIN || new URL(base).origin }, body: JSON.stringify(body) });
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', ...args], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let log = ''; child.stderr.on('data', chunk => { log += chunk.toString(); });
    child.on('error', reject); child.on('close', code => resolve({ code, log }));
  });
}
assert.equal((await post({ ...profile, videoMusic: 'false' })).status, 400);
for (const music of [true, false]) {
  // Omission tests the backward-compatible default: music enabled.
  const response = await post(music ? profile : { ...profile, videoMusic: false });
  assert.equal(response.status, 200, response.ok ? '' : await response.text());
  const file = path.join(directory, music ? 'video-music.mp4' : 'video-silent.mp4');
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  const decoded = await run(['-v', 'error', '-i', file, '-f', 'null', '-']);
  assert.equal(decoded.code, 0, decoded.log);
  const audio = await run(['-i', file, '-map', '0:a:0', '-af', 'volumedetect', '-f', 'null', '-']);
  if (music) {
    assert.equal(audio.code, 0, audio.log);
    assert.match(audio.log, /Audio: aac/);
    assert.match(audio.log, /Carefree by Kevin MacLeod/);
    const mean = Number(audio.log.match(/mean_volume: (-?[\d.]+) dB/)?.[1]);
    assert(mean > -65 && mean < -15, `Volume moyen inattendu : ${mean} dB`);
    assert.match(audio.log, /Duration: 00:00:08\.[45]/);
    const frame = await run(['-y', '-ss', '7', '-i', file, '-frames:v', '1', path.join(directory, 'video-music-credits.png')]);
    assert.equal(frame.code, 0, frame.log);
    console.log(`✓ MP4 musical décodé : AAC, volume discret (${mean} dB), durée et crédits metadata vérifiés.`);
  } else {
    assert.notEqual(audio.code, 0);
    assert.match(audio.log, /matches no streams/);
    assert(!audio.log.includes('Carefree by Kevin MacLeod'));
    console.log('✓ MP4 sans musique décodé : aucune piste audio.');
  }
}
console.log('✓ Choix de musique invalide rejeté. Image des crédits extraite pour inspection.');
