import { z } from 'zod';

// What a panel tells the host about itself, and what the host tells the
// panel it is. Four of the five values here are ones a plugin hands over —
// its path, its title, its trail, its terms — and each of those is a place a
// framed app's cast reaches the workbench's own state unchecked.

export const PanelKindSchema = z.enum(['route', 'pane']);
export type PanelKind = z.infer<typeof PanelKindSchema>;

// Everything under /p/<plugin>, query string included; '' for a pane.
export const PathSchema = z.string();

// The tab or block title. Until a panel sets one, the host shows a
// placeholder built from the plugin's title and the panel's path.
export const TitleSchema = z.string();

// What this panel is about, as namespaced terms — `uniprot:P0AEX9`,
// `taxon:562`. The host asks other plugins what they have about them.
export const PanelTermsSchema = z.array(z.string());

// One step of a panel's trail: where this level is, in the plugin's own
// words, and the path that gets back to it. A crumb that only names a level
// leaves the path out.
export const CrumbSchema = z.object({
  label: z.string(),
  path: z.string().optional(),
  // A mark beside the label, by name from the host's icon set. A plugin
  // naming itself as the root of its own trail wants its own mark there, and
  // the manifest's `icon` is the name to give.
  icon: z.string().optional(),
});
export type Crumb = z.infer<typeof CrumbSchema>;

export const CrumbsSchema = z.array(CrumbSchema);

// The panel as it stands, which is what the host hands a mount and what
// `usePanel` re-renders on. The handle carries these beside the calls that
// change them; this is the readable half on its own, for a body that is not
// in this process.
export const PanelStateSchema = z.object({
  // Opaque; stable while the panel lives, whatever its path becomes.
  id: z.string().min(1),
  plugin: z.string().min(1),
  kind: PanelKindSchema,
  path: PathSchema,
  focused: z.boolean(),
});
export type PanelState = z.infer<typeof PanelStateSchema>;
