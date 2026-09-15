import type { Layout } from './layout';
import { LayoutSchema } from './layout';
import { groups } from './tree';

export function serialize(layout: Layout): string {
  return JSON.stringify(layout);
}

// Structural rules the schema cannot state. A layout that breaks one is
// treated as corrupt rather than repaired: the user loses an arrangement,
// not their work, and a default is always renderable.
export function validate(layout: Layout): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const group of groups(layout.main)) {
    for (const tab of group.tabs) {
      if (!(tab in layout.panels)) errors.push(`tab ${tab} has no panel`);
      if (seen.has(tab)) errors.push(`panel ${tab} appears twice`);
      seen.add(tab);
    }
    if (group.active !== null && !group.tabs.includes(group.active)) {
      errors.push(`group ${group.id} activates a tab it lacks`);
    }
    if (group.active === null && group.tabs.length > 0) {
      errors.push(`group ${group.id} has tabs but no active tab`);
    }
  }
  checkSizes(layout.main, errors);
  for (const [id, panel] of Object.entries(layout.panels)) {
    if (panel.id !== id) errors.push(`panel ${id} is keyed by the wrong id`);
  }
  for (const id of layout.sidebar.folded) {
    if (!(id in layout.panels)) errors.push(`folded ${id} has no panel`);
  }
  if (new Set(layout.sidebar.pinned).size !== layout.sidebar.pinned.length) {
    errors.push('a plugin is pinned twice');
  }
  if (layout.focus !== null && !(layout.focus in layout.panels)) {
    errors.push(`focus ${layout.focus} has no panel`);
  }
  return errors;
}

function checkSizes(node: Layout['main'], errors: string[]) {
  if (node.kind !== 'split') return;
  if (node.sizes.length !== node.children.length) {
    errors.push(`split ${node.id} sizes do not match its children`);
  }
  node.children.forEach((c) => checkSizes(c, errors));
}

export function deserialize(text: string | null | undefined, fallback: () => Layout): Layout {
  if (!text) return fallback();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fallback();
  }
  const parsed = LayoutSchema.safeParse(raw);
  if (!parsed.success || validate(parsed.data).length > 0) return fallback();
  return parsed.data;
}
