export type Work = { id: string; title: string; image: string; description?: string };
export type Profile = { owner: string; extra: string; name: string; job: string; city: string; phone: string; services: string; bio: string; works: Work[]; validated: boolean; showContact: boolean; tagline?: string; availability?: string; experience?: string; coverId?: string };
export const emptyProfile: Profile = { owner: '', extra: '', name: '', job: '', city: '', phone: '', services: '', bio: '', works: [], validated: false, showContact: false };
let photoSequence = 0;
export function createPhotoId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  // Local photo key only. Private access tokens are generated separately on the server.
  photoSequence++;
  return `photo-${Date.now().toString(36)}-${photoSequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function draftPresentation(profile: Profile) {
  const services = profile.services.split('\n').map(s => s.trim()).filter(Boolean).join(', ');
  return `${profile.job ? `Je suis ${profile.job.toLowerCase()}. ` : ''}Mon activité s’appelle ${profile.name || 'Mon atelier'}${profile.city ? ` et se trouve à ${profile.city}` : ''}.${services ? ` Je propose les prestations suivantes : ${services}.` : ''}${profile.extra ? ` ${profile.extra}` : ''}`;
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  downloadLink(url, filename);
  // Leave the URL alive long enough for mobile browsers to start the transfer.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function downloadLink(url: string, filename: string) {
  const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
}
export function coverWork(p: Profile) { return p.works.find(work => work.id === p.coverId) || p.works[0]; }
export function serviceList(p: Profile) { return p.services.split(/[\n;•]+/).map(service => service.trim()).filter(Boolean); }
export function phoneLinks(phone: string) {
  const raw = phone.replace(/[^0-9]/g, '');
  const digits = raw.startsWith('00') ? raw.slice(2) : raw.length === 8 ? `228${raw}` : raw;
  return { tel: `tel:+${digits}`, whatsapp: /^\d{8,15}$/.test(digits) ? `https://wa.me/${digits}` : '' };
}
