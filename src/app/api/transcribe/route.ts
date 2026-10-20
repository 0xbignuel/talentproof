import { failure, HttpError, sameOrigin } from '@/lib/server/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get('content-length')) > 4 * 1024 * 1024) throw new HttpError(413, 'L’enregistrement est trop long. Répondez en moins de 45 secondes.');
    const body = await request.formData(); const audio = body.get('audio');
    if (!(audio instanceof File) || audio.size > 3 * 1024 * 1024 || !audio.size || !/^(audio|video)\/(webm|mp4|ogg|wav|x-wav|mpeg)/.test(audio.type)) throw new HttpError(400, 'L’enregistrement audio est invalide.');
    const response = await fetch(`${process.env.WHISPER_URL || 'http://127.0.0.1:8000'}/transcribe`, { method: 'POST', body: audio, headers: { 'Content-Type': audio.type, ...(process.env.VOICE_SERVICE_TOKEN ? { Authorization: `Bearer ${process.env.VOICE_SERVICE_TOKEN}` } : {}) }, signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new HttpError(503, 'Le service vocal est momentanément indisponible. Réessayez ou écrivez votre réponse.');
    const data = await response.json(); return Response.json({ text: typeof data.text === 'string' ? data.text.slice(0, 1500) : '' });
  } catch (error) { if (error instanceof HttpError) return failure(error); return failure(new HttpError(503, 'Le service vocal ne répond pas. Vous pouvez écrire votre réponse.')); }
}
