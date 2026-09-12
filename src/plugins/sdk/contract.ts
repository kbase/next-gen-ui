import { z } from 'zod';
import { version as SDK_VERSION } from './package.json';

// The manifest: what the host learns about a plugin before loading any of
// its code. The author writes `plugin.config.ts`; the build adds
// `sdkVersion` and `modules` and serves the result as manifest.json.

export { SDK_VERSION };

// `sdkVersion` is the SDK the plugin was built against. Federation's shared
// scope hands the plugin the workbench's copy at runtime, so a plugin built
// against a later SDK can import a name that copy does not have; a plugin
// built against an earlier one imports a subset. Additions bump the minor
// and removals the major, so a lower minor loads and a higher one does not —
// except under 0.x, where semver gives a minor the weight of a major and
// only the workbench's own minor loads. The patch never moves the contract.
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function acceptsSdkVersion(declared: string, host: string = SDK_VERSION): boolean {
  const built = SEMVER.exec(declared);
  const mine = SEMVER.exec(host);
  if (!built || !mine) return false;
  const [builtMajor, builtMinor] = [Number(built[1]), Number(built[2])];
  const [hostMajor, hostMinor] = [Number(mine[1]), Number(mine[2])];
  if (builtMajor !== hostMajor) return false;
  return hostMajor === 0 ? builtMinor === hostMinor : builtMinor <= hostMinor;
}

// The rule in the words a plugin author needs to act on.
const ACCEPTED_RANGE = SDK_VERSION.startsWith('0.')
  ? `${SDK_VERSION.split('.').slice(0, 2).join('.')}.x`
  : `${SDK_VERSION.split('.')[0]}.0.0 through ${SDK_VERSION}`;

const NAME = /^[a-z][a-z0-9-]*$/;

export const ArgDeclSchema = z.object({
  name: z.string().regex(NAME),
  description: z.string().optional(),
  required: z.boolean().optional(),
});
export type ArgDecl = z.infer<typeof ArgDeclSchema>;

// A command the user can type: `/cancel 12`. Declared so the prompt bar can
// complete and validate it before the plugin's code exists.
export const SlashCommandSchema = z.object({
  // The slash name, without the slash. Registered as "<id>:<name>".
  name: z.string().regex(NAME),
  title: z.string(),
  description: z.string().optional(),
  // Typed in this order.
  args: z.array(ArgDeclSchema).optional(),
  // What the prompt bar ranks the command by when the text is not a slash
  // command: indexed, never shown. Absent, the title and descriptions serve.
  semantics: z
    .object({
      // What the command does, in the words a user would type for it,
      // synonyms included.
      description: z.string(),
      // Phrasings that should reach this command.
      examples: z.array(z.string()).optional(),
    })
    .optional(),
  // A name from the host's icon table, for surfaces that show the command
  // as a button.
  icon: z.string().optional(),
});
export type SlashCommand = z.infer<typeof SlashCommandSchema>;

// A call to a command with its arguments filled in: what a launcher, a
// shortcut button, a recommendation or a status line runs when pressed.
export const CommandCallSchema = z.object({
  label: z.string().min(1),
  // "plugin:name"; a bare "name" is the declaring plugin's own.
  command: z.string().regex(/^(?:[a-z][a-z0-9-]*:)?[a-z][a-z0-9-]*$/),
  args: z.record(z.string(), z.string()).optional(),
});
export type CommandCall = z.infer<typeof CommandCallSchema>;

// Plugin ids are URL-visible (`/p/<id>/...`), so they are restricted to what
// reads well there and never change once published.
export const PluginIdSchema = z.string().regex(/^[a-z][a-z0-9-]{1,40}$/);

// The six modules a bundle can hold, each fetched at its own moment.
export const MODULES = ['background', 'route', 'pane', 'commands', 'prompt', 'intent'] as const;
export const ModuleSchema = z.enum(MODULES);
export type Module = z.infer<typeof ModuleSchema>;

// What the author writes.
export const PluginConfigSchema = z.object({
  id: PluginIdSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  // A name from the host's icon table; unknown names fall back to a pin.
  icon: z.string().optional(),
  // A name from the host's colour table, tinting this plugin's icon
  // wherever it appears. Unknown or absent draws in the surrounding ink.
  color: z.string().optional(),
  commands: z.array(SlashCommandSchema).optional(),
  // Buttons in the sidebar's Shortcuts block.
  shortcuts: z.array(CommandCallSchema).optional(),
  // The button on Browse. Without one the plugin is not listed there.
  launcher: CommandCallSchema.optional(),
});
export type PluginConfig = z.infer<typeof PluginConfigSchema>;

// What the host reads: the config plus what the build knows.
export const ManifestSchema = PluginConfigSchema.extend({
  sdkVersion: z.string().refine((v) => acceptsSdkVersion(v), {
    message: `sdkVersion must be ${ACCEPTED_RANGE}; this workbench serves SDK ${SDK_VERSION}, and a plugin runs against the copy it serves`,
  }),
  // Which modules the bundle exposes — exactly the files vite.config.ts
  // named. The host fetches nothing the list omits and offers only what a
  // listed module backs.
  modules: z.array(ModuleSchema),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export function parseManifest(raw: unknown): Manifest {
  return ManifestSchema.parse(raw);
}

// `plugin.config.ts` default-exports this. Identity at runtime; the type is
// the point, and the build reads the object.
export function definePluginManifest(config: PluginConfig): PluginConfig {
  return config;
}

// The manifest the build writes, and the one the host computes for a
// bundled plugin: the config, this SDK's version, and the modules that were
// named — in the contract's order, whatever order they came in.
export function manifestFor(config: PluginConfig, modules: readonly Module[]): Manifest {
  return {
    ...PluginConfigSchema.parse(config),
    sdkVersion: SDK_VERSION,
    modules: MODULES.filter((m) => modules.includes(m)),
  };
}

// "plugin:name" as written in a CommandCall or typed after the slash; a bare
// name belongs to `owner`.
export function qualifyCommand(command: string, owner: string): string {
  return command.includes(':') ? command : `${owner}:${command}`;
}
