import type { PanelId } from '../core';

// DOM ids for tab/tabpanel pairing. Panel ids carry '/', '?' and '=', which
// are legal in ids but awkward in selectors, so each is escaped.
export const tabDomId = (id: PanelId) => `wb-tab-${slug(id)}`;
export const panelDomId = (id: PanelId) => `wb-panel-${slug(id)}`;
const slug = (id: string) =>
  id.replace(/[^a-zA-Z0-9_-]/g, (c) => `_${c.charCodeAt(0).toString(16)}`);
