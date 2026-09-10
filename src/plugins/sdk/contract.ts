import { z } from 'zod';
import { version as SDK_VERSION } from './package.json';

// The manifest: what the host learns about a plugin before loading any of
// its code. The author writes `plugin.config.ts`; the build adds
// `sdkVersion` and `modules` and serves the result as manifest.json.

// The SDK versions whose plugins this host loads. A manifest built with
// another is skipped at registry time, so a contract change ships as a new
// SDK version and the host lists the ones it still understands.
export { SDK_VERSION };
// 0.1.0 predates the intent module; a plugin built with it lists nothing the
// host cannot load.
export const ACCEPTED_SDK_VERSIONS: readonly string[] = [SDK_VERSION, '0.1.0'];

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
  args: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
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
  sdkVersion: z.string().refine((v) => ACCEPTED_SDK_VERSIONS.includes(v), {
    message: `sdkVersion must be one of ${ACCEPTED_SDK_VERSIONS.join(', ')}`,
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
