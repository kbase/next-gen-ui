import type { Crumb } from '../../plugins/sdk';
import type { PanelId } from '../core';

// What each tab in one group is called. A tab names the thing you would
// switch to, so it stays as short as the plugin wrote it until two tabs in
// the same group read alike. Then the host borrows the deepest crumb that
// actually differs between them — the trail is already there and already
// says what makes these two panels different — and numbers only what no
// trail can separate.

export interface TabEntry {
  id: PanelId;
  title: string;
  trail: Crumb[];
}

const SEPARATOR = ' · ';

export function negotiateLabels(tabs: TabEntry[]): Record<PanelId, string> {
  const labels: Record<PanelId, string> = {};
  const byTitle = new Map<string, TabEntry[]>();
  for (const tab of tabs) {
    const group = byTitle.get(tab.title);
    if (group) group.push(tab);
    else byTitle.set(tab.title, [tab]);
  }

  for (const [title, group] of byTitle) {
    if (group.length === 1) {
      labels[group[0].id] = title;
      continue;
    }
    // The deepest level at which these trails disagree is the one worth
    // showing: a shallower one is shared context, a deeper one does not
    // exist for at least one of them.
    const depth = Math.max(...group.map((t) => t.trail.length));
    let at = -1;
    for (let i = depth - 1; i >= 0; i -= 1) {
      const labelsAt = group.map((t) => t.trail[i]?.label);
      if (new Set(labelsAt).size > 1) {
        at = i;
        break;
      }
    }
    group.forEach((tab, index) => {
      const borrowed = at >= 0 ? tab.trail[at]?.label : undefined;
      // A crumb that repeats the title adds nothing: "Report · Report".
      const crumb = borrowed === title ? undefined : borrowed;
      labels[tab.id] = crumb ? `${crumb}${SEPARATOR}${title}` : `${title} (${index + 1})`;
    });
  }

  // Borrowing a crumb can still leave two tabs alike — the same crumb over
  // the same title. Those, and only those, fall back to numbering.
  const counts = new Map<string, number>();
  for (const tab of tabs) counts.set(labels[tab.id], (counts.get(labels[tab.id]) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const tab of tabs) {
    const label = labels[tab.id];
    if ((counts.get(label) ?? 0) < 2) continue;
    const n = (seen.get(label) ?? 0) + 1;
    seen.set(label, n);
    labels[tab.id] = `${label} (${n})`;
  }
  return labels;
}
