import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Between Bridges — London AR',
  icons: { icon: '/favicon.svg' },
  description: 'Two bridges. Ten encounters. A mobile artwork along the Thames. Local Phase 1 prototype.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
