import { useEffect, useSyncExternalStore } from 'react';
import { frontPanel } from '../../core';
import { useLayout, useServices } from '../context';

// Keeps the page and cart queries current: the two sources of terms the user
// does not type. What is typed is the prompt bar's own question, and asks a
// different thing of the plugins. Values are compared, not the arrays holding
// them, so a render that changes nothing asks nothing.
//
// These two pools are also the two tiers of context the intent is given while
// the user types (host/query/runner.ts). No plugin is asked about them on a
// keystroke; the ranker weighs them, under what was typed.
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
  // That exclusion also settles which tier a term in both places is weighed
  // under: the page's, which is the stronger of the two.
  const cartTerms = [...new Set([...items].reverse().flatMap((i) => i.terms ?? []))].filter(
    (t) => !pageTerms.includes(t),
  );
  const cartLabel = `${items.length} item${items.length === 1 ? '' : 's'}`;

  // The question is the panel and what it says it is about; the title is not
  // part of it.
  const pageKey = `${front?.id ?? ''}|${pageTerms.join(',')}`;
  useEffect(() => {
    queryRunner.set('page', { terms: pageTerms, owner: front?.plugin, label: pageLabel });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pageKey stands for the values
  }, [queryRunner, pageKey]);

  // A panel titles itself after it reports its terms, and again whenever what
  // it shows changes; the heading follows without restarting the round.
  useEffect(() => {
    queryRunner.label('page', pageLabel);
  }, [queryRunner, pageLabel]);

  // Likewise the cart: the question is the terms its items carry, and the
  // count is what the heading calls them. An item that carries no term other
  // plugins have not been asked about already changes the count alone.
  const cartKey = cartTerms.join(',');
  useEffect(() => {
    queryRunner.set('cart', { terms: cartTerms, label: cartLabel });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cartKey stands for the values
  }, [queryRunner, cartKey]);

  useEffect(() => {
    queryRunner.label('cart', cartLabel);
  }, [queryRunner, cartLabel]);

  useEffect(() => () => queryRunner.stop(), [queryRunner]);
}
