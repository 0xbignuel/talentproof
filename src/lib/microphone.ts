export const insecureMicrophoneMessage = 'Le micro nécessite le lien HTTPS de TalentProof. Avec cette adresse HTTP, vous pouvez écrire votre réponse.';
export function microphoneError(error: unknown) {
  const value = error as { name?: string; message?: string };
  if (value.name === 'NotAllowedError' || value.name === 'SecurityError') return 'L’accès au micro est bloqué. Vérifiez l’autorisation de ce site et celle du navigateur dans les réglages du téléphone.';
  if (value.name === 'NotFoundError') return 'Aucun microphone n’a été trouvé sur cet appareil.';
  if (value.name === 'NotReadableError') return 'Le micro est peut-être utilisé par une autre application. Fermez-la et réessayez.';
  return value.message || 'Le micro ne peut pas être ouvert. Vous pouvez écrire votre réponse.';
}
