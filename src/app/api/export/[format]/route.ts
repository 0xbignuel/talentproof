import { makeMp4, makePdf } from '@/lib/server/exports';
import { failure, HttpError, readJson, sameOrigin } from '@/lib/server/http';
import { publicProfile, validateProfile } from '@/lib/server/validation';
export const runtime = 'nodejs';
export const maxDuration = 120;
export async function POST(request: Request, { params }: { params: Promise<{ format: string }> }) {
  try {
    sameOrigin(request); const { format } = await params;
    if (format !== 'pdf' && format !== 'mp4') throw new HttpError(404, 'Ce format n’existe pas.');
    const profile = publicProfile(validateProfile(await readJson(request)));
    const bytes = format === 'pdf' ? await makePdf(profile) : await makeMp4(profile);
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': format === 'pdf' ? 'application/pdf' : 'video/mp4', 'Content-Disposition': `attachment; filename="talentproof.${format}"`, 'Cache-Control': 'no-store', 'Content-Length': String(bytes.byteLength) } });
  } catch (error) { return failure(error); }
}
