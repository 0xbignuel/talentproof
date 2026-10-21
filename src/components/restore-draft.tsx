'use client';
import { useRef } from 'react';
import { parseProfile } from '@/lib/profile-storage';
import type { Profile } from '@/lib/portfolio';
export function RestoreDraft({ onRestore, onError }: { onRestore: (profile: Profile) => void; onError: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <><button className="button secondary" onClick={() => input.current?.click()}>Importer une sauvegarde</button><input ref={input} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Importer une sauvegarde TalentProof" onChange={async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try { if (file.size > 8 * 1024 * 1024) throw new Error('Cette sauvegarde est trop volumineuse (8 Mo maximum).'); onRestore(parseProfile(JSON.parse(await file.text()))); }
    catch (error) { onError(error instanceof Error ? error.message : 'La sauvegarde ne peut pas être importée.'); }
  }}/></>;
}
