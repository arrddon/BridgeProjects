import BridgeApp from '@/components/bridge-app';
import { bridges } from '@/lib/bridge-config';
import { redirect } from 'next/navigation';
export async function generateMetadata({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const bridge = bridges.find(item => item.id === path[0]);
  const spot = bridge?.spots.find(item => item.id === path[1]);
  return { title: bridge ? `${spot?.title ?? bridge.title} — Between Bridges` : 'Not found — Between Bridges' };
}
export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const legacy = { 'bridge-a': 'AlbertBridge', 'bridge-b': 'HammersmithBridge' }[path[0]];
  if (legacy) redirect(`/${[legacy, ...path.slice(1)].map(encodeURIComponent).join('/')}`);
  return <BridgeApp path={path} />;
}
