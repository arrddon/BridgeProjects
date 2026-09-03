import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Albert Bridge',
  icons: { icon: '/favicon.svg' },
  description: 'Explore Albert Bridge through an interactive map and AR experiences.',
  openGraph: { title: 'Albert Bridge', description: 'Explore Albert Bridge through an interactive map and AR experiences.', type: 'website' },
  twitter: { card: 'summary', title: 'Albert Bridge', description: 'Explore Albert Bridge through an interactive map and AR experiences.' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
