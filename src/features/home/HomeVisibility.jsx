import { useEffect, useRef, useState } from 'react';
// Keep the same layout and animation instance; prepare GPU effects before they enter view.
export default function HomeVisibility({ children, className, defer = false }) {
  const ref = useRef(null), [ready, setReady] = useState(!defer), [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setReady(true); setVisible(true); return; }
    const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setReady(true); near.disconnect(); } }, { rootMargin: '500px' });
    const view = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    near.observe(ref.current); view.observe(ref.current);
    return () => { near.disconnect(); view.disconnect(); };
  }, []);
  return <div ref={ref} className={className}>{ready ? typeof children === 'function' ? children(visible) : children : null}</div>;
}
