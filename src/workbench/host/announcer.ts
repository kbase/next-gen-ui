import { createStore } from '../core/subscribable';

// One place every announcement goes; the LiveRegion component reads it.
// The nonce lets the same sentence be announced twice in a row.
export interface Announcement {
  text: string;
  nonce: number;
}

export interface Announcer {
  announce: (text: string) => void;
  get: () => Announcement;
  subscribe: (listener: () => void) => () => void;
}

export function createAnnouncer(): Announcer {
  // Only the latest announcement is held: what a reader wants said is what
  // has just happened, and a queue would read out a backlog. The nonce is
  // what makes two of the same sentence two values, so the store's "changed
  // or not" is the same question as "was something announced".
  const latest = createStore<Announcement>({ text: '', nonce: 0 });
  return {
    announce(text) {
      if (!text) return;
      latest.set({ text, nonce: latest.get().nonce + 1 });
    },
    get: latest.get,
    subscribe: latest.subscribe,
  };
}
