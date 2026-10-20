import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { PortfolioView } from '@/components/portfolio-view';
import { getPortfolio } from '@/lib/server/store';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const record = await getPortfolio(id);
  if (!record?.published) return { title: 'Portfolio indisponible — TalentProof', robots: { index: false, follow: false } };
  const p = record.profile; const host = (await headers()).get('host') || 'localhost:3000';
  const origin = process.env.APP_ORIGIN || `http://${host}`;
  const title = `${p.name} · ${p.job} à ${p.city}`;
  const description = `${p.tagline ? `${p.tagline} ` : ''}${p.bio}`.slice(0, 240);
  return { metadataBase: new URL(origin), title, description, robots: { index: false, follow: false }, openGraph: { title, description, type: 'website', locale: 'fr_FR', url: `/p/${id}`, siteName: p.name }, twitter: { card: 'summary_large_image', title, description } };
}
export default async function PublicPortfolio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const record = await getPortfolio(id);
  if (!record?.published) notFound();
  return <main className="public-page"><a className="public-brand" href="/">talentproof.</a><PortfolioView profile={record.profile}/><p className="public-invite">Vous aussi, donnez une vitrine à votre talent. <a href="/">Créer ma présentation →</a></p></main>;
}
