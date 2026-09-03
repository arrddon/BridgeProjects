import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import BridgeApp from '../components/bridge-app';
import { usePathname, useRouter } from './navigation';
import '../app/globals.css';

function App() {
  const pathname = usePathname();
  const router = useRouter();
  const path = pathname.split('/').filter(Boolean).map(part => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  const legacy = { 'bridge-a': 'AlbertBridge', 'bridge-b': 'HammersmithBridge' }[path[0]];
  const redirect = !path.length ? '/AlbertBridge' : legacy ? `/${[legacy, ...path.slice(1)].map(encodeURIComponent).join('/')}` : null;
  useEffect(() => { if (redirect) router.replace(redirect); }, [redirect, router]);
  useEffect(() => { document.title = 'Albert Bridge'; }, [pathname]);
  return redirect ? null : <BridgeApp path={path} />;
}
createRoot(document.getElementById('root')!).render(<App />);
