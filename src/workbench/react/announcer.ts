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
  let current: Announcement = { text: '', nonce: 0 };
  const listeners = new Set<() => void>();
  return {
    announce(text) {
      if (!text) return;
      current = { text, nonce: current.nonce + 1 };
      listeners.forEach((l) => l());
    },
    get: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
