import { emptyProfile, type Profile } from './portfolio';
export function parseProfile(input: unknown, keepValidation = false): Profile {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Cette sauvegarde ne peut pas être lue.');
  const value = input as Record<string, unknown>; const result: Profile = { ...emptyProfile, works: [] };
  const limits = { owner: 120, extra: 1200, name: 120, job: 120, city: 120, phone: 120, services: 1200, bio: 2000, tagline: 120, availability: 180, experience: 180, coverId: 80 } as const;
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    if (value[key] !== undefined && typeof value[key] !== 'string') throw new Error('Une information de la sauvegarde est invalide.');
    result[key] = typeof value[key] === 'string' ? value[key].slice(0, limits[key]) : '';
  }
  if (!Array.isArray(value.works) || value.works.length > 6) throw new Error('Cette sauvegarde ne contient pas de réalisations valides.');
  result.works = value.works.map((work, index) => {
    if (!work || typeof work.title !== 'string' || typeof work.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(work.image) || work.image.length > 1_100_000) throw new Error('Une photo de la sauvegarde est invalide.');
    return { id: typeof work.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(work.id) ? work.id : `photo-${index}`, title: work.title.slice(0, 120), image: work.image, description: typeof work.description === 'string' ? work.description.slice(0, 400) : '' };
  });
  result.showContact = value.showContact === true; result.validated = keepValidation && value.validated === true;
  return result;
}
