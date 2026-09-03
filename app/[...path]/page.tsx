import BridgeApp from '@/components/bridge-app';
import { redirect } from 'next/navigation';
export function generateMetadata() { return { title: 'Albert Bridge' }; }
export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const legacy = { 'bridge-a': 'AlbertBridge', 'bridge-b': 'HammersmithBridge' }[path[0]];
  if (legacy) redirect(`/${[legacy, ...path.slice(1)].map(encodeURIComponent).join('/')}`);
  return <BridgeApp path={path} />;
}
