import { IconArrowUpRight } from '@tabler/icons-react';
import { useStore } from '../../core/store';

export default function ProjectLink({ view, children, className = '' }) {
  const url = new URL(window.location.href);
  url.searchParams.set('vista', view);
  url.searchParams.delete('sec');
  const navigate = event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    useStore.getState().setView(view);
  };
  return <a className={`project-link ${className}`} href={url.pathname + url.search + url.hash} onClick={navigate}>{children}<IconArrowUpRight size={17} aria-hidden="true" /></a>;
}
