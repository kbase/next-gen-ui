import { useEffect, useState, type RefObject } from 'react';

/* Whether an element is near the viewport, for pausing work nobody can see.
   One observer serves every caller, so a page full of skeletons costs one.
   The 200px margin resumes an element just before it scrolls into view. */

const listeners = new WeakMap<Element, (inView: boolean) => void>();
let observer: IntersectionObserver | undefined;

function sharedObserver() {
  if (!observer && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => listeners.get(e.target)?.(e.isIntersecting)),
      { rootMargin: '200px' },
    );
  }
  return observer;
}

export function useInView(ref: RefObject<HTMLElement | null>) {
  // Starts true so an element on screen at first paint animates immediately.
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    const obs = sharedObserver();
    if (!el || !obs) return;
    listeners.set(el, setInView);
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      listeners.delete(el);
    };
  }, [ref]);

  return inView;
}
