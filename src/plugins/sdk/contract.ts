import { MODULES, ManifestSchema, PluginConfigSchema, SDK_VERSION } from './boundary/manifest';
import type { Manifest, Module, PluginConfig } from './boundary/manifest';

// The manifest contract: the shapes are in `boundary/manifest.ts`, which is
// where every value that crosses is defined, and what is here is what the
// build and the host do with them. `plugin.config.ts` imports this file
// through `@kbase/plugin-sdk/config`, which reaches no React.

export {
  SDK_VERSION,
  acceptsSdkVersion,
  MODULES,
  ManifestSchema,
  PluginConfigSchema,
  ModuleSchema,
  ArgDeclSchema,
  SlashCommandSchema,
  CommandCallSchema,
  PluginIdSchema,
} from './boundary/manifest';
export type {
  Manifest,
  PluginConfig,
  Module,
  ArgDecl,
  SlashCommand,
  CommandCall,
} from './boundary/manifest';
export { MatchKindSchema, MatchSchema, OfferSchema } from './boundary/background';
export type { MatchKind, Match, Offer } from './boundary/background';
export { CONTEXT_TIERS, ContextTierSchema, TieredTermsSchema } from './boundary/intent';
export type { ContextTier, TieredTerms } from './boundary/intent';

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
