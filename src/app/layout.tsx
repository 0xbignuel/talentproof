import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/components/identity-options.css';

export const metadata: Metadata = {
  title: 'TalentProof — Votre talent a une voix',
  description: 'Parlez de votre savoir-faire. Votre assistante vous aide à créer un portfolio, une page et une vidéo.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'TalentProof', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#3063ed' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
