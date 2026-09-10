import { z } from 'zod';

// The saved arrangement of the workbench. "Layout" here is the persisted
// shape only; nothing in this directory knows about React or the DOM.

export type PluginId = string;
export type PanelId = string;
export type GroupId = string;
export type SplitId = string;

// A route is a plugin's page at a path; a pane is its sidebar block.
export const PanelKindSchema = z.enum(['route', 'pane']);
export type PanelKind = z.infer<typeof PanelKindSchema>;

// A panel's identity is its id, which is opaque and stable while the panel
// lives; the path is what it is showing and changes as the user navigates
// inside it. The host never parses a path — which paths are the same page
// is the plugin's `normalize` to say, and the host asks at open time.
export const PanelSchema = z.object({
  id: z.string().min(1),
  plugin: z.string().min(1),
  kind: PanelKindSchema,
  // Everything under /p/<plugin>, query string included. '' for a pane.
  path: z.string(),
});
export type Panel = z.infer<typeof PanelSchema>;

export const GroupSchema = z.object({
  kind: z.literal('group'),
  id: z.string().min(1),
  tabs: z.array(z.string()),
  active: z.string().nullable(),
});
export type Group = z.infer<typeof GroupSchema>;

export type SplitDir = 'row' | 'col';
export interface Split {
  kind: 'split';
  id: SplitId;
  dir: SplitDir;
  sizes: number[];
  children: Node[];
}
export type Node = Group | Split;

export const NodeSchema: z.ZodType<Node> = z.lazy(() => z.union([GroupSchema, SplitSchema]));
export const SplitSchema: z.ZodType<Split> = z.object({
  kind: z.literal('split'),
  id: z.string().min(1),
  dir: z.enum(['row', 'col']),
  sizes: z.array(z.number()),
  children: z.array(NodeSchema),
});

export const SidebarSchema = z.object({
  pinned: z.array(z.string()),
  folded: z.array(z.string()),
  sizes: z.record(z.string(), z.number()),
  collapsed: z.boolean(),
  width: z.number(),
});
export type Sidebar = z.infer<typeof SidebarSchema>;

export const BarsSchema = z.object({ status: z.boolean(), prompt: z.boolean() });
export type Bars = z.infer<typeof BarsSchema>;
export type BarName = keyof Bars;

export const LayoutSchema = z.object({
  version: z.literal(2),
  panels: z.record(z.string(), PanelSchema),
  main: NodeSchema,
  sidebar: SidebarSchema,
  bars: BarsSchema,
  focus: z.string().nullable(),
  keybindings: z.record(z.string(), z.string()),
  // A locked layout keeps its arrangement: structural operations no-op.
  // Defaulted so layouts saved before the field still parse.
  locked: z.boolean().default(false),
  // Host blocks this layout has already been offered. A block added to the
  // host after a layout was saved is pinned once, on the next load, and never
  // again — so a new one arrives for existing users, and one they unpinned
  // stays unpinned. Defaulted for layouts saved before the field.
  introduced: z.array(z.string()).default([]),
});
export type Layout = z.infer<typeof LayoutSchema>;

export function panelType(plugin: PluginId, kind: PanelKind): string {
  return `${plugin}/${kind}`;
}

// One pane per plugin, so its id is fixed: pinning and unpinning meet the
// same panel without a lookup table.
export function paneId(plugin: PluginId): PanelId {
  return panelType(plugin, 'pane');
}

export function makePane(plugin: PluginId): Panel {
  return { id: paneId(plugin), plugin, kind: 'pane', path: '' };
}

// A route panel's id is minted when it opens; `key` is unique per open and
// the caller supplies it, so the core stays deterministic under test.
export function makeRoute(plugin: PluginId, path: string, key: string): Panel {
  return { id: `${panelType(plugin, 'route')}#${key}`, plugin, kind: 'route', path };
}

export const DEFAULT_SIDEBAR_WIDTH = 280;

export function emptyGroup(id: GroupId): Group {
  return { kind: 'group', id, tabs: [], active: null };
}

export interface DefaultLayoutOptions {
  pinned?: PluginId[];
  rootGroupId?: GroupId;
}

export function defaultLayout({
  pinned = [],
  rootGroupId = 'root',
}: DefaultLayoutOptions = {}): Layout {
  const panels: Record<PanelId, Panel> = {};
  for (const plugin of pinned) {
    const panel = makePane(plugin);
    panels[panel.id] = panel;
  }
  return {
    version: 2,
    panels,
    main: emptyGroup(rootGroupId),
    sidebar: {
      pinned: [...pinned],
      folded: [],
      sizes: {},
      collapsed: false,
      width: DEFAULT_SIDEBAR_WIDTH,
    },
    bars: { status: true, prompt: true },
    focus: null,
    keybindings: {},
    locked: false,
    introduced: [...pinned],
  };
}
