import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import type {
  Background,
  DeclaredCommand,
  Intent,
  Manifest,
  Module,
  Modules,
  PluginHost,
} from '../../plugins/sdk';
import type { PluginId } from '../core';
import type { ArgSpec, Command, CommandRegistry } from '../commands';
import type { ArgDecl } from '../../plugins/sdk';
import { iconFor } from './icons';

// The host's index of installed plugins: manifests now, modules on demand.
// Each module is fetched the first time something needs it and kept for
// the session; `background` is fetched at startup, because the host calls
// it on its own clock rather than the user's.

export type ModuleLoaders = { [K in Module]?: () => Promise<Modules[K]> };

export interface InstalledPlugin {
  manifest: Manifest;
  // One loader per module the manifest lists.
  modules: ModuleLoaders;
}

export interface PluginInfo {
  id: PluginId;
  title: string;
  icon: ComponentType<IconProps>;
}

export interface HostIndex {
  plugins: () => PluginInfo[];
  manifest: (id: PluginId) => Manifest | undefined;
  manifests: () => Manifest[];
  // Every manifest's commands, each with the plugin that declares it.
  declaredCommands: () => DeclaredCommand[];
  // Whether the manifest lists the module — what the host may offer before
  // fetching anything.
  has: (id: PluginId, kind: Module) => boolean;
  // Resolves to the module, loading it once. Rejects if the plugin is not
  // installed, does not list the module, or fails to load it.
  module: <K extends Module>(id: PluginId, kind: K) => Promise<Modules[K]>;
  // The module if it has already loaded; never triggers a load.
  loaded: <K extends Module>(id: PluginId, kind: K) => Modules[K] | undefined;
  anyLoaded: (id: PluginId) => boolean;
  // Every background module that has arrived, in registration order.
  backgrounds: () => { plugin: PluginId; title: string; background: Background }[];
  subscribe: (listener: () => void) => () => void;
  // Bumps when a module finishes loading; pairs with subscribe for React.
  version: () => number;
  // Registers the manifest-declared commands. `host` builds the PluginHost a
  // command runs against.
  registerCommands: (registry: CommandRegistry, host: (plugin: PluginId) => PluginHost) => void;
}

export function createHostIndex(installed: InstalledPlugin[]): HostIndex {
  const byId = new Map(installed.map((p) => [p.manifest.id, p]));
  const loaded = new Map<string, unknown>();
  const loading = new Map<string, Promise<unknown>>();
  const listeners = new Set<() => void>();
  let version = 0;

  const bump = () => {
    version += 1;
    listeners.forEach((l) => l());
  };

  const has = (id: PluginId, kind: Module) =>
    byId.get(id)?.manifest.modules.includes(kind) ?? false;

  const module = <K extends Module>(id: PluginId, kind: K): Promise<Modules[K]> => {
    const key = `${id}/${kind}`;
    const have = loaded.get(key);
    if (have) return Promise.resolve(have as Modules[K]);
    const pending = loading.get(key);
    if (pending) return pending as Promise<Modules[K]>;
    const plugin = byId.get(id);
    if (!plugin) return Promise.reject(new Error(`plugin ${id} is not installed`));
    if (!plugin.manifest.modules.includes(kind)) {
      return Promise.reject(new Error(`plugin ${id} has no ${kind} module`));
    }
    const load = plugin.modules[kind];
    if (!load)
      return Promise.reject(new Error(`plugin ${id} lists ${kind} but supplies no loader`));
    const promise = load()
      .then((value) => {
        loaded.set(key, value);
        loading.delete(key);
        bump();
        return value;
      })
      .catch((err: unknown) => {
        loading.delete(key);
        throw err;
      });
    loading.set(key, promise);
    return promise;
  };

  const declaredCommands = (): DeclaredCommand[] =>
    installed.flatMap(({ manifest }) =>
      (manifest.commands ?? []).map((decl) => ({
        ...decl,
        plugin: manifest.id,
        pluginTitle: manifest.title,
      })),
    );

  // Fetched now, not on first use: the host calls `terms` and `suggest` on
  // every keystroke and `status` on its own schedule, so a module that has
  // not arrived simply says nothing until it does. An intent is handed the
  // catalog as it arrives; the installed set does not change within a
  // session. A rejection is the plugin's problem, not the bar's.
  for (const { manifest } of installed) {
    for (const kind of ['background', 'intent'] as const) {
      if (!manifest.modules.includes(kind)) continue;
      module(manifest.id, kind)
        .then((loaded) => {
          if (kind === 'intent') (loaded as Intent).index(declaredCommands());
        })
        .catch((err: unknown) => {
          console.warn(
            `plugin ${manifest.id}: its ${kind} module failed to load; ignoring it`,
            err,
          );
        });
    }
  }

  return {
    plugins: () =>
      installed.map(({ manifest }) => ({
        id: manifest.id,
        title: manifest.title,
        icon: iconFor(manifest.icon, manifest.color),
      })),
    manifest: (id) => byId.get(id)?.manifest,
    manifests: () => installed.map((p) => p.manifest),
    declaredCommands,
    has,
    module,
    loaded: <K extends Module>(id: PluginId, kind: K) =>
      loaded.get(`${id}/${kind}`) as Modules[K] | undefined,
    anyLoaded: (id) => [...loaded.keys()].some((key) => key.startsWith(`${id}/`)),
    backgrounds: () =>
      installed.flatMap(({ manifest }) => {
        const background = loaded.get(`${manifest.id}/background`) as Background | undefined;
        return background ? [{ plugin: manifest.id, title: manifest.title, background }] : [];
      }),
    version: () => version,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    registerCommands(registry, host) {
      for (const { manifest } of installed) {
        for (const decl of manifest.commands ?? []) {
          const command: Command = {
            name: decl.name,
            title: decl.title,
            description: decl.description,
            source: manifest.id,
            args: (decl.args ?? []).map(toArgSpec),
            run: async (values, caller) => {
              const commands = await module(manifest.id, 'commands');
              const fn = commands[decl.name];
              if (!fn) {
                throw new Error(
                  `plugin ${manifest.id} declares /${decl.name} but does not implement it`,
                );
              }
              await fn(values, { host: host(manifest.id), caller });
            },
          };
          registry.register(command);
        }
      }
    },
  };
}

// A manifest argument is typed by the handler once it runs; the bar only
// needs to know how many there are and which are required.
function toArgSpec(decl: ArgDecl): ArgSpec {
  return {
    name: decl.name,
    description: decl.description,
    required: decl.required,
    type: 'string',
  };
}
