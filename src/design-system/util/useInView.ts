import { useCallback, useState, type RefCallback } from 'react';

/* Whether an element is near the viewport, for pausing work nobody can see.
   One observer serves every caller, so a page full of skeletons costs one —
   which fixes its margin for everyone. Returns a ref to put on the element. */

const listeners = new WeakMap<Element, Set<(inView: boolean) => void>>();
let observer: IntersectionObserver | undefined;

function sharedObserver() {
  if (!observer && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => listeners.get(e.target)?.forEach((fn) => fn(e.isIntersecting))),
      { rootMargin: '200px' },
    );
  }
  return observer;
}

export function useInView<T extends Element>(): [RefCallback<T>, boolean] {
  // Starts true so an element on screen at first paint animates immediately.
  const [inView, setInView] = useState(true);

  const ref = useCallback<RefCallback<T>>((el) => {
    const obs = el && sharedObserver();
    if (!el || !obs) return;

    let set = listeners.get(el);
    if (!set) {
      set = new Set();
      listeners.set(el, set);
      obs.observe(el);
    }
    set.add(setInView);

    return () => {
      set.delete(setInView);
      if (set.size === 0) {
        obs.unobserve(el);
        listeners.delete(el);
      }
    };
  }, []);

  return [ref, inView];
}
