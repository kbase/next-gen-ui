import { useEffect, useSyncExternalStore } from 'react';
import { frontPanel } from '../core';
import { useLayout, useServices } from './context';

// Keeps the page and cart queries current. The front tab's terms and the
// cart's are the two sources the user does not type; the prompt bar drives
// the third. Values are compared, not the arrays holding them, so a render
// that changes nothing asks nothing.
export function useAmbientQueries() {
  const { queryRunner, terms: termStore, cart, titles } = useServices();
  const layout = useLayout();
  useSyncExternalStore(termStore.subscribe, termStore.version, termStore.version);
  useSyncExternalStore(cart.subscribe, cart.version, cart.version);
  useSyncExternalStore(titles.subscribe, titles.version, titles.version);

  const front = frontPanel(layout);
  const pageTerms = front ? termStore.get(front.id) : [];
  const pageLabel = front ? (titles.get(front.id) ?? front.path) : '';
  const items = cart.items();
  // Newest first, so the thing just added leads what the cart is asked
  // about; the page's own terms are left out, since the page already asked.
  const cartTerms = [...new Set([...items].reverse().flatMap((i) => i.terms ?? []))].filter(
    (t) => !pageTerms.includes(t),
  );
  const cartLabel = `${items.length} item${items.length === 1 ? '' : 's'}`;

  const pageKey = `${front?.id ?? ''}|${pageTerms.join(',')}|${pageLabel}`;
  useEffect(() => {
    queryRunner.set('page', { terms: pageTerms, owner: front?.plugin, label: pageLabel });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pageKey stands for the values
  }, [queryRunner, pageKey]);

  const cartKey = `${cartTerms.join(',')}|${cartLabel}`;
  useEffect(() => {
    queryRunner.set('cart', { terms: cartTerms, label: cartLabel });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cartKey stands for the values
  }, [queryRunner, cartKey]);

  useEffect(() => () => queryRunner.stop(), [queryRunner]);
}
