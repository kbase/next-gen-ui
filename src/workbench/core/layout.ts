import { z } from 'zod';

// The saved arrangement of the workbench. "Layout" here is the persisted
// shape only; nothing in this directory knows about React or the DOM.

export type PluginId = string;
export type PanelId = string;
export type GroupId = string;
export type SplitId = string;

export const PanelKindSchema = z.enum(['navigator', 'document']);
export type PanelKind = z.infer<typeof PanelKindSchema>;

export const PanelSchema = z.object({
  id: z.string().min(1),
  plugin: z.string().min(1),
  kind: PanelKindSchema,
  params: z.record(z.string(), z.string()),
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
  version: z.literal(1),
  panels: z.record(z.string(), PanelSchema),
  main: NodeSchema,
  sidebar: SidebarSchema,
  bars: BarsSchema,
  focus: z.string().nullable(),
  keybindings: z.record(z.string(), z.string()),
  // A locked layout keeps its arrangement: structural operations no-op.
  // Defaulted so layouts saved before the field still parse.
  locked: z.boolean().default(false),
});
export type Layout = z.infer<typeof LayoutSchema>;

// A panel is identified by (type, params). The id is the type plus the
// params as a sorted query string, so two opens of the same resource meet
// at the same id without a lookup table.
export function panelType(plugin: PluginId, kind: PanelKind): string {
  return `${plugin}/${kind}`;
}

export function panelId(
  plugin: PluginId,
  kind: PanelKind,
  params: Record<string, string> = {},
): PanelId {
  const type = panelType(plugin, kind);
  const keys = Object.keys(params).sort();
  if (keys.length === 0) return type;
  const query = new URLSearchParams();
  for (const key of keys) query.append(key, params[key]);
  return `${type}?${query.toString()}`;
}

export function makePanel(
  plugin: PluginId,
  kind: PanelKind,
  params: Record<string, string> = {},
): Panel {
  return { id: panelId(plugin, kind, params), plugin, kind, params: { ...params } };
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
    const panel = makePanel(plugin, 'navigator');
    panels[panel.id] = panel;
  }
  return {
    version: 1,
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
  };
}
