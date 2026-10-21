'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyProfile, type Profile } from '@/lib/portfolio';
import { readDraft, saveDraft } from '@/lib/drafts';
import { parseProfile } from '@/lib/profile-storage';
const KEY = 'talentproof-profile-v1';
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [canSave, setCanSave] = useState(false);
  const latest = useRef(profile); latest.current = profile;
  useEffect(() => {
    let active = true;
    async function load() {
    try {
      let value = await readDraft<Record<string, unknown>>('profile');
      if (!value) { const stored = localStorage.getItem(KEY); if (stored) value = JSON.parse(stored); }
      if (value) {
        const loaded = parseProfile(value, true);
        if (active) setProfile(loaded);
      }
      if (active) setCanSave(true);
    }
    catch { if (active) setSaveError('La sauvegarde locale ne peut pas être lue.'); }
    if (active) setReady(true);
    }
    void load(); return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready || !canSave) return;
    const timer = setTimeout(() => {
      saveDraft('profile', profile).then(() => setSaveError('')).catch(() => setSaveError('L’enregistrement sur cet appareil est indisponible. Gardez une sauvegarde de vos informations.'));
    }, 200);
    return () => clearTimeout(timer);
  }, [profile, ready, canSave]);
  useEffect(() => {
    if (!ready || !canSave) return;
    const save = () => { void saveDraft('profile', latest.current).catch(() => {}); };
    window.addEventListener('pagehide', save); return () => window.removeEventListener('pagehide', save);
  }, [ready, canSave]);
  const update = useCallback((patch: Partial<Profile>) => setProfile(current => ({ ...current, ...patch, validated: patch.validated ?? false })), []);
  return { profile, update, ready, saveError };
}
