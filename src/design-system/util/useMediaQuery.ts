import { useCallback, useSyncExternalStore } from 'react';

/* Without matchMedia every query reads false, so a caller must treat false as
   no answer rather than as a negative one. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia?.(query);
      if (!list) return () => {};
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia?.(query).matches ?? false, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
