'use client';
import { useEffect, useState } from 'react';
export function usePwa() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [offlineError, setOfflineError] = useState('');
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') { setOfflineError('Le mode hors connexion est disponible avec le lancement mobile.'); return; }
    if (!window.isSecureContext || !('serviceWorker' in navigator)) { setOfflineError('Ouvrez la version HTTPS pour activer le mode hors connexion.'); return; }
    let active = true;
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(() => navigator.serviceWorker.ready).then(() => { if (active) setOfflineReady(true); }).catch(() => { if (active) setOfflineError('Le mode hors connexion n’a pas pu être préparé. Réessayez avec une connexion.'); });
    return () => { active = false; };
  }, []);
  return { offlineReady, offlineError };
}
