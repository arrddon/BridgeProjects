import { useSyncExternalStore, type ComponentProps } from 'react';

const changed = 'bridge:navigate';
function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  window.addEventListener(changed, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(changed, listener);
  };
}
export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname, () => '/');
}
function navigate(href: string, replace = false) {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) { window.location.assign(url.href); return; }
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url.href);
  window.dispatchEvent(new Event(changed));
}
const router = { push: (href: string) => navigate(href), replace: (href: string) => navigate(href, true) };
export function useRouter() { return router; }
export default function Link({ href, onClick, ...props }: ComponentProps<'a'>) {
  return <a {...props} href={href} onClick={event => {
    onClick?.(event);
    if (!href || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || props.download != null || (props.target && props.target !== '_self')) return;
    if (new URL(href, window.location.href).origin !== window.location.origin) return;
    event.preventDefault(); navigate(href);
  }} />;
}
