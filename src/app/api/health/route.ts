export const dynamic = 'force-dynamic';
export async function GET() {
  let voice = 'unavailable'; let assistant = 'unavailable';
  const llama = process.env.LLAMA_URL || (!process.env.OLLAMA_URL ? 'http://127.0.0.1:8081' : '');
  await Promise.allSettled([
    fetch(`${process.env.WHISPER_URL || 'http://127.0.0.1:8000'}/health`, { signal: AbortSignal.timeout(1500), cache: 'no-store' }).then(async r => { if (r.ok && (await r.json()).ready) voice = 'ready'; }),
    llama
      ? fetch(`${llama}/health`, { signal: AbortSignal.timeout(1500), cache: 'no-store' }).then(r => { if (r.ok) assistant = 'ready'; })
      : fetch(`${process.env.OLLAMA_URL || 'http://127.0.0.1:11434'}/api/tags`, { signal: AbortSignal.timeout(1500), cache: 'no-store' }).then(async r => { if (r.ok) { const data = await r.json(); if (data.models?.some((m: { name: string }) => m.name === (process.env.OLLAMA_MODEL || 'qwen3:0.6b'))) assistant = 'ready'; } }),
  ]);
  return Response.json({ voice, assistant, storage: process.env.DATABASE_URL ? 'postgresql' : 'local' }, { headers: { 'Cache-Control': 'no-store' } });
}
