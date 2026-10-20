import { ImageResponse } from 'next/og';
import { coverWork } from '@/lib/portfolio';
import { getPortfolio } from '@/lib/server/store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Découvrez ce savoir-faire sur TalentProof';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function SocialImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const record = await getPortfolio(id);
  if (!record?.published) return new Response('Portfolio indisponible', { status: 404 });
  const p = record.profile; const cover = coverWork(p);
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', background: '#f0f4ff', color: '#142d56' }}><div style={{ display: 'flex', flexDirection: 'column', width: '58%', padding: '58px' }}><span style={{ color: '#7896c8', fontSize: 17, letterSpacing: 4 }}>UN SAVOIR-FAIRE À DÉCOUVRIR</span><span style={{ marginTop: 65, fontSize: 23, color: '#3063ed' }}>{p.job}</span><span style={{ marginTop: 22, fontSize: p.name.length > 35 ? 43 : 60, lineHeight: 1.15 }}>{p.name}</span><span style={{ marginTop: 24, fontSize: 21, lineHeight: 1.5, color: '#778bad' }}>{p.tagline || p.city}</span><span style={{ marginTop: 'auto', fontSize: 20, color: '#8aa0c4' }}>talentproof.</span></div><div style={{ display: 'flex', width: '42%', height: '100%', background: '#dce6ff' }}>{cover && <img src={cover.image} alt="" width={504} height={630} style={{ objectFit: 'cover' }}/>}</div></div>, { ...size, headers: { 'Cache-Control': 'no-store' } });
}
