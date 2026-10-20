'use client';
import { Icon } from './icon';
export type ReadyExport = { url: string; filename: string; file: File };
export function ExportReady({ result, onError }: { result?: ReadyExport; onError: (message: string) => void }) {
  if (!result) return null;
  const pdf = result.file.type === 'application/pdf';
  return <div className="export-ready" role="status"><strong><Icon name="check" size={16}/>{pdf ? 'Votre PDF est prêt' : 'Votre vidéo est prête'}</strong><a href={result.url} download={result.filename}><Icon name="download" size={17}/>{pdf ? 'Enregistrer mon PDF' : 'Enregistrer ma vidéo'}</a><div><a href={result.url} target="_blank" rel="noopener noreferrer">{pdf ? 'Ouvrir le PDF' : 'Voir la vidéo'}<Icon name="arrow" size={15}/></a>{typeof navigator !== 'undefined' && navigator.canShare?.({ files: [result.file] }) && <button onClick={async () => { try { await navigator.share({ files: [result.file], title: 'Mon portfolio TalentProof' }); } catch (error) { if ((error as Error).name !== 'AbortError') onError('Le partage a échoué. Utilisez le lien pour enregistrer le fichier.'); } }}>Envoyer<Icon name="arrow" size={15}/></button>}</div></div>;
}
