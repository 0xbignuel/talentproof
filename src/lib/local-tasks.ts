import type { Profile } from './portfolio';
import { photoOnMainThread } from './photo';
function runWorker<T>(worker: Worker, data: unknown, timeoutMs = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    const timer = setTimeout(() => { finish(); reject(new Error('La préparation prend trop de temps. Réessayez avec moins de photos.')); }, timeoutMs);
    worker.onmessage = event => { finish(); if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.result); };
    worker.onerror = () => { finish(); reject(new Error('Le traitement local n’a pas pu démarrer.')); };
    worker.postMessage(data);
  });
}
export async function preparePhoto(file: File) {
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function') {
    try { return await runWorker<string>(new Worker(new URL('../workers/photo.worker.ts', import.meta.url)), file); }
    catch { /* Older mobile engines can still decode the image on the main thread. */ }
  }
  return photoOnMainThread(file);
}
export async function prepareLocalPdf(profile: Profile): Promise<Blob> {
  if (typeof Worker === 'undefined') throw new Error('Le PDF local n’est pas pris en charge par ce navigateur.');
  const bytes = await runWorker<ArrayBuffer>(new Worker(new URL('../workers/pdf.worker.ts', import.meta.url)), profile, 60000);
  return new Blob([bytes], { type: 'application/pdf' });
}
