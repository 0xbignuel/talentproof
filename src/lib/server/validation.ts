import { emptyProfile, type Profile } from '../portfolio';
import { HttpError } from './http';

export function validateProfile(input: unknown, requireComplete = true): Profile {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Votre présentation est manquante.');
  const data = input as Record<string, unknown>; const result: Profile = { ...emptyProfile, works: [] };
  const limits = { owner: 120, extra: 1200, name: 120, job: 120, city: 120, phone: 120, services: 1200, bio: 2000, tagline: 120, availability: 180, experience: 180, coverId: 80 } as const;
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    if (data[key] !== undefined && typeof data[key] !== 'string') throw new HttpError(400, 'Une information est dans un format incorrect.');
    const value = (data[key] as string || '').trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    if (value.length > limits[key]) throw new HttpError(400, 'Une réponse est trop longue. Raccourcissez-la pour continuer.');
    result[key] = value;
  }
  result.showContact = data.showContact === true; result.validated = data.validated === true;
  if (!Array.isArray(data.works) || data.works.length > 6) throw new HttpError(400, 'Ajoutez entre une et six photos.');
  result.works = data.works.map((value, index) => {
    const w = value as Record<string, unknown>;
    if (!w || typeof w.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(w.image) || w.image.length > 1_100_000 || typeof w.title !== 'string' || w.title.length > 120) throw new HttpError(400, 'Une photo ou sa légende est invalide.');
    const id = typeof w.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(w.id) ? w.id : String(index);
    if (w.description !== undefined && (typeof w.description !== 'string' || w.description.length > 400)) throw new HttpError(400, 'La description d’une réalisation est trop longue (400 caractères maximum).');
    return { id, title: w.title.trim(), image: w.image, description: typeof w.description === 'string' ? w.description.trim() : '' };
  });
  if (requireComplete && (!result.name || !result.job || !result.city || !result.services || !result.bio || !result.works.length || !result.validated)) throw new HttpError(400, 'Complétez et validez le récapitulatif avant de créer vos supports.');
  return result;
}
export function publicProfile(p: Profile): Profile { return { ...p, phone: p.showContact ? p.phone : '' }; }
