import { cookies } from 'next/headers';
import { failure, HttpError, readJson, requestOrigin, sameOrigin } from '@/lib/server/http';
import { getPortfolio, hashToken, newIdentity, savePortfolio, tokenMatches } from '@/lib/server/store';
import { publicProfile, validateProfile } from '@/lib/server/validation';
export const runtime = 'nodejs';
const COOKIE = 'talentproof-owner';
async function identity() {
  const jar = await cookies(); const value = jar.get(COOKIE)?.value; if (!value) return null;
  const [id, token] = value.split('.'); if (!id || !token || token.length > 100) return null;
  const record = await getPortfolio(id); return record && tokenMatches(record, token) ? { record, token } : null;
}
export async function GET() {
  try { const owner = await identity(); return Response.json(owner ? { id: owner.record.id, published: owner.record.published } : { id: null, published: false }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request); const body = await readJson(request) as { profile?: unknown; consent?: boolean };
    if (!body || typeof body !== 'object') throw new HttpError(400, 'Votre présentation est manquante.');
    if (body.consent !== true) throw new HttpError(400, 'Votre accord est nécessaire avant de publier votre page.');
    const profile = publicProfile(validateProfile(body.profile));
    const owner = await identity(); const { id, token } = owner ? { id: owner.record.id, token: owner.token } : newIdentity();
    await savePortfolio({ id, tokenHash: hashToken(token), profile, published: true, updatedAt: new Date().toISOString() });
    (await cookies()).set(COOKIE, `${id}.${token}`, { httpOnly: true, sameSite: 'strict', secure: requestOrigin(request).startsWith('https:'), path: '/', maxAge: 60 * 60 * 24 * 365 });
    return Response.json({ id, path: `/p/${id}` }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try { sameOrigin(request); const owner = await identity(); if (!owner) throw new HttpError(401, 'Ouvrez votre espace depuis l’appareil utilisé pour publier.'); await savePortfolio({ ...owner.record, published: false, updatedAt: new Date().toISOString() }); return Response.json({ ok: true }); }
  catch (error) { return failure(error); }
}
