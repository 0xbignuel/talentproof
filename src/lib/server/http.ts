export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== requestOrigin(request)) throw new HttpError(403, 'Cette demande ne provient pas de TalentProof.');
}
export function requestOrigin(request: Request) {
  // Next may expose its bind address (0.0.0.0) in request.url. The browser uses Host.
  // A reverse proxy with HTTPS termination can set the canonical APP_ORIGIN explicitly.
  if (process.env.APP_ORIGIN) return new URL(process.env.APP_ORIGIN).origin;
  const url = new URL(request.url);
  return new URL(`${url.protocol}//${request.headers.get('host') || url.host}`).origin;
}
export async function readJson(request: Request, limit = 8 * 1024 * 1024): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'Vos photos sont trop volumineuses. Choisissez des fichiers plus légers.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'La demande est vide.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new HttpError(413, 'La demande est trop volumineuse.'); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Le contenu de la demande est invalide.'); }
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error('TalentProof server error:', error instanceof Error ? error.name : 'UnknownError');
  return Response.json({ error: 'Une erreur est survenue. Vos informations sont toujours sur cet appareil. Réessayez dans un instant.' }, { status: 500 });
}
