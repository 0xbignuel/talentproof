'use client';
import { useCallback, useEffect, useState } from 'react';
import { emptyProfile, type Profile } from '@/lib/portfolio';
const KEY = 'talentproof-profile-v1';
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const value = JSON.parse(stored) as Record<string, unknown>;
        const loaded: Profile = { ...emptyProfile, works: [] };
        for (const key of ['owner', 'extra', 'name', 'job', 'city', 'phone', 'services', 'bio'] as const) {
          if (typeof value[key] === 'string') loaded[key] = value[key].slice(0, key === 'bio' ? 2000 : key === 'services' || key === 'extra' ? 1200 : 120);
        }
        for (const key of ['tagline', 'availability', 'experience', 'coverId'] as const) {
          if (typeof value[key] === 'string') loaded[key] = value[key].slice(0, key === 'coverId' ? 80 : key === 'tagline' ? 120 : 180);
        }
        if (Array.isArray(value.works)) loaded.works = value.works.filter(w => w && typeof w.id === 'string' && typeof w.title === 'string' && typeof w.image === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(w.image)).slice(0, 6).map(w => ({ id: w.id, title: w.title.slice(0, 120), image: w.image, description: typeof w.description === 'string' ? w.description.slice(0, 400) : '' }));
        loaded.showContact = value.showContact === true; loaded.validated = value.validated === true;
        setProfile(loaded);
      }
    }
    catch { setSaveError('La sauvegarde locale ne peut pas être lue.'); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(profile)); setSaveError(''); }
    catch { setSaveError('Stockage plein ou indisponible. Téléchargez une sauvegarde et réduisez vos photos.'); }
  }, [profile, ready]);
  const update = useCallback((patch: Partial<Profile>) => setProfile(current => ({ ...current, ...patch, validated: patch.validated ?? false })), []);
  return { profile, update, ready, saveError };
}
