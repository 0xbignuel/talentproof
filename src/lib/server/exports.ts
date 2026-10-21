export { makePdf } from './pdf';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { coverWork, type Profile, type Work } from '../portfolio';
import { HttpError } from './http';

const imageBytes = (image: string) => Buffer.from(image.slice(image.indexOf(',') + 1), 'base64');
const xml = (text: string) => text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
async function videoText(text: string, y: number, size = 28, color = '#142d56') {
  if (!text.trim()) return null;
  const limited = text.length > 62 ? text.slice(0, 59) + '…' : text;
  const fontSize = Math.min(size, Math.floor(610 / Math.max(limited.length * 0.56, 1)));
  const input = await sharp({ text: { text: `<span foreground="${color}">${xml(limited)}</span>`, font: `DM Sans ${Math.max(12, fontSize)}`, fontfile: path.join(process.cwd(), 'public', 'fonts', 'dm-sans.ttf'), rgba: true, dpi: 72 } }).png().toBuffer();
  return { input, left: 55, top: y - fontSize };
}
const globalJobs = globalThis as typeof globalThis & { talentproofVideoBusy?: boolean };
export async function makeMp4(p: Profile, withMusic = true) {
  const binary = ffmpeg;
  if (!binary) throw new HttpError(503, 'L’export vidéo n’est pas disponible sur ce serveur.');
  if (globalJobs.talentproofVideoBusy) throw new HttpError(429, 'Une vidéo est en préparation. Réessayez dans quelques instants.');
  globalJobs.talentproofVideoBusy = true;
  let directory = '';
  try {
    directory = await mkdtemp(path.join(tmpdir(), 'talentproof-')); const frameNames: string[] = [];
    const scenes: { kind: 'intro' | 'work' | 'outro'; work?: Work; duration: number }[] = [
      { kind: 'intro', work: coverWork(p), duration: 2.5 },
      ...p.works.map(work => ({ kind: 'work' as const, work, duration: 3 })),
      { kind: 'outro', duration: 3 },
    ];
    const duration = scenes.reduce((total, scene) => total + scene.duration, 0);
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]; const work = scene.work;
      const photoHeight = scene.kind === 'intro' ? 490 : 570;
      // Preserve the whole creation: a dress or hairstyle must not be cropped in an export.
      const photo = work ? await sharp(imageBytes(work.image), { limitInputPixels: 20_000_000 }).rotate().resize(610, photoHeight, { fit: 'contain', background: '#eef3ff' }).jpeg().toBuffer() : null;
      const background = scene.kind === 'outro' ? '#142d56' : '#f5f7fc';
      const svg = `<svg width="720" height="960" xmlns="http://www.w3.org/2000/svg"><rect width="720" height="960" fill="${background}"/><rect width="720" height="8" fill="#3063ED"/></svg>`;
      const texts = await Promise.all(scene.kind === 'outro' ? [
        videoText('UNE HISTOIRE DE SAVOIR-FAIRE', 78, 17, '#a4bded'),
        videoText(p.name, 225, 45, '#ffffff'), videoText(p.job, 283, 27, '#b8ccff'),
        videoText(p.city, 329, 24, '#a4bded'),
        videoText(p.showContact && p.phone ? 'PARLONS DE VOTRE PROJET' : 'MERCI DE VOTRE VISITE', 495, 23, '#b8ccff'),
        videoText(p.showContact && p.phone ? p.phone : 'Découvrez mes réalisations.', 560, 38, '#ffffff'),
        videoText(p.availability || '', 625, 21, '#b8ccff'),
        ...(withMusic ? [
          videoText('Carefree — Kevin MacLeod (incompetech.com)', 735, 19, '#a4bded'),
          videoText('CC BY 4.0 · creativecommons.org/licenses/by/4.0/', 768, 17, '#a4bded'),
          videoText('Extrait adapté : durée, volume et fondus.', 801, 17, '#a4bded'),
        ] : []),
        videoText('talentproof. · Votre talent mérite sa vitrine.', 878, 19, '#a4bded'),
      ] : [
        videoText('TALENTPROOF · LE SAVOIR-FAIRE A UN VISAGE', 60, 15, '#3063ed'),
        videoText(p.name, 129, 42), videoText(`${p.job} · ${p.city}`, 170, 21, '#6b7a92'),
        videoText(scene.kind === 'intro' ? p.tagline || 'Mon travail, mon histoire, mes créations.' : work?.title || `Réalisation ${i}`, 815, 27),
        videoText(scene.kind === 'intro' ? 'Bienvenue dans mon univers.' : work?.description || '', 851, 18, '#6b7a92'),
        videoText(p.showContact && p.phone ? `Contact : ${p.phone}` : 'Découvrez mon savoir-faire.', 900, 23),
        videoText(scene.kind === 'intro' ? 'MON PORTFOLIO PROFESSIONNEL' : `${i} / ${p.works.length}     ·     Une sélection de mes réalisations.`, 938, 15, '#6b7a92'),
      ]);
      const filename = `scene-${i}.jpg`; frameNames.push(filename);
      await sharp(Buffer.from(svg)).composite([...(photo ? [{ input: photo, left: 55, top: scene.kind === 'intro' ? 235 : 205 }] : []), ...texts.filter(text => text !== null)]).jpeg({ quality: 88 }).toFile(path.join(directory, filename));
    }
    const manifest = frameNames.map((filename, index) => `file '${filename}'\nduration ${scenes[index].duration}`).join('\n') + `\nfile '${frameNames[frameNames.length - 1]}'\n`;
    await writeFile(path.join(directory, 'frames.txt'), manifest);
    const output = path.join(directory, 'portfolio.mp4');
    const audioArguments = withMusic ? [
      '-stream_loop', '-1', '-i', path.join(process.cwd(), 'public', 'audio', 'carefree.mp3'),
      '-map', '0:v:0', '-map', '1:a:0',
      '-af', `volume=0.22,afade=t=in:st=0:d=0.8,afade=t=out:st=${duration - 1.2}:d=1.2`,
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-metadata', 'comment=Carefree by Kevin MacLeod (https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037). CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ . Adapted: excerpt, looping, volume, fades.',
    ] : ['-an'];
    await new Promise<void>((resolve, reject) => {
      const process = spawn(binary, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '1', '-i', path.join(directory, 'frames.txt'), ...audioArguments, '-vf', `fps=24,format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=${duration - .4}:d=0.4`, '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '25', '-t', String(duration), '-movflags', '+faststart', output], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      let diagnostic = ''; process.stderr.on('data', chunk => { if (diagnostic.length < 2000) diagnostic += chunk.toString(); });
      const timeout = setTimeout(() => { process.kill(); reject(new HttpError(503, 'La vidéo prend trop de temps. Réessayez avec moins de photos.')); }, 90000);
      process.on('error', () => { clearTimeout(timeout); reject(new HttpError(503, 'Le moteur vidéo n’a pas pu démarrer.')); });
      process.on('close', code => { clearTimeout(timeout); if (code === 0) resolve(); else { console.error('Video encoding failed:', diagnostic.replace(/talentproof-[^\s]+/g, '[temporary file]')); reject(new HttpError(503, 'La vidéo n’a pas pu être créée. Réessayez.')); } });
    });
    return await readFile(output);
  } finally { if (directory) await rm(directory, { recursive: true, force: true }); globalJobs.talentproofVideoBusy = false; }
}
