import type {
  Background,
  CommandCall,
  DeclaredCall,
  DeclaredCommand,
  Intent,
  Manifest,
  Module,
  Modules,
  PluginHost,
} from '@kbase/plugin-sdk';
import { qualifyCommand } from '@kbase/plugin-sdk';
import type { PluginId } from '../../core';
import { createNotifier } from '../../core/subscribable';
import type { Command, CommandRegistry } from '../../commands';
import type { DeclinedPlugin } from './registry';

// What a pane row runs: `show`, which focuses the pane of a pinned plugin
// and previews an unpinned one, and in neither case moves anything. A row
// the reader reached by typing a name is not a request to rearrange the
// workbench; `open`, which makes a tab, is reached by asking for it. Named
// here because a pane is a module and not a command: this is the command
// that shows one.
const SHOW_PANE = 'workbench:show';

// The host's index of installed plugins: manifests now, modules on demand.
// Each module is fetched the first time something needs it and kept while
// the plugin is installed; `background` is fetched at startup, because the
// host calls it on its own clock rather than the user's. The set changes
// through `add` and `remove`; every reader either subscribes to the index
// or asks it at call time, so nothing holds a copy of the list.

export type ModuleLoaders = { [K in Module]?: () => Promise<Modules[K]> };

export interface InstalledPlugin {
  manifest: Manifest;
  // One loader per module the manifest lists.
  modules: ModuleLoaders;
  // Where the manifest was fetched from, for a plugin installed by URL while
  // the workbench runs. Bundled and registry plugins have none.
  origin?: { url: string };
}

// What the chrome needs about an installed plugin without asking for its
// manifest: `icon` and `color` are the names the manifest gives, resolved to
// a glyph by the React layer (`react/icons.ts`).
export interface PluginInfo {
  id: PluginId;
  title: string;
  icon: string | undefined;
  color: string | undefined;
}

export interface HostIndex {
  plugins: () => PluginInfo[];
  manifest: (id: PluginId) => Manifest | undefined;
  manifests: () => Manifest[];
  // What the registry listed and the workbench did not load, with the reason.
  declined: () => DeclinedPlugin[];
  // Every manifest's commands, each with the plugin that declares it.
  declaredCommands: () => DeclaredCommand[];
  // Every call the manifests have already filled in: launchers, shortcut
  // buttons, and one per plugin with a sidebar pane.
  declaredCalls: () => DeclaredCall[];
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
  // Bumps when a module finishes loading or the installed set changes; pairs
  // with subscribe for React.
  version: () => number;
  // Registers the manifest-declared commands. `host` builds the PluginHost a
  // command runs against. A plugin added after this call is registered the
  // same way.
  registerCommands: (registry: CommandRegistry, host: (plugin: PluginId) => PluginHost) => void;
  origin: (id: PluginId) => { url: string } | undefined;
  // Installs a plugin now: registers its commands, fetches `background` and
  // `intent`, and hands every loaded intent the grown catalog. Throws if the
  // id is taken.
  add: (plugin: InstalledPlugin) => void;
  // Uninstalls: its commands are unregistered, its loaded modules dropped,
  // and every loaded intent is handed the shrunk catalog. A load still in
  // flight resolves to nothing kept. Unknown id: no change.
  remove: (id: PluginId) => void;
}

export function createHostIndex(
  initial: InstalledPlugin[],
  declined: DeclinedPlugin[] = [],
): HostIndex {
  const installed = [...initial];
  const byId = new Map(installed.map((p) => [p.manifest.id, p]));
  const loaded = new Map<string, unknown>();
  const loading = new Map<string, Promise<unknown>>();
  // Nothing here is one value: what changes is which modules have arrived
  // and which plugins are installed, and every reader asks the index about
  // that its own way. The version is the whole of what they subscribe to.
  const { subscribe, version, changed: bump } = createNotifier();
  // Where commands go, once `registerCommands` has said; until then a plugin's
  // commands wait for that call, which registers every plugin installed.
  let commandTarget:
    | { registry: CommandRegistry; host: (plugin: PluginId) => PluginHost }
    | undefined;
  const unregisters = new Map<PluginId, (() => void)[]>();

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
        loading.delete(key);
        // The plugin was removed, or removed and installed again, while the
        // load was in flight: the value belongs to an installation that is
        // over, and the caller gets it without the index keeping it.
        if (byId.get(id) !== plugin) return value;
        loaded.set(key, value);
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

  // The calls a manifest makes without being asked anything: the button on
  // Browse, the buttons in the Shortcuts block, and — for a plugin with a
  // pane — showing that pane. Each is a row the prompt bar could offer, so
  // each goes to the intent beside the declared commands; a plugin is
  // reachable by its own name and a button by the label its author wrote.
  const declaredCalls = (): DeclaredCall[] =>
    installed.flatMap(({ manifest }) => {
      const whose = { plugin: manifest.id, pluginTitle: manifest.title };
      const call = (c: CommandCall) => ({
        ...c,
        command: qualifyCommand(c.command, manifest.id),
        ...whose,
      });
      return [
        // A launcher and a pane stand for the whole plugin, so they carry its
        // description; a shortcut stands for one command and carries none.
        ...(manifest.launcher
          ? [{ ...call(manifest.launcher), description: manifest.description }]
          : []),
        ...(manifest.shortcuts ?? []).map(call),
        ...(manifest.modules.includes('pane')
          ? [
              {
                label: `Show ${manifest.title}`,
                command: SHOW_PANE,
                args: { plugin: manifest.id },
                ...whose,
                description: manifest.description,
              },
            ]
          : []),
      ];
    });

  // An intent is handed the catalog when it arrives and again whenever the
  // installed set changes, so what it ranks is what the workbench can do
  // now. A throw is the intent's problem: it keeps whatever it indexed last.
  const index = (plugin: PluginId, intent: Intent) => {
    try {
      intent.index(declaredCommands(), declaredCalls());
    } catch (err) {
      console.warn(`plugin ${plugin}: its intent threw on index; ignoring it`, err);
    }
  };
  const reindex = () => {
    for (const { manifest } of installed) {
      const intent = loaded.get(`${manifest.id}/intent`) as Intent | undefined;
      if (intent) index(manifest.id, intent);
    }
  };

  // Fetched now, not on first use: the host calls `terms` and `suggest` on
  // every keystroke and `status` on its own schedule, so a module that has
  // not arrived simply says nothing until it does. A rejection is the
  // plugin's problem, not the bar's.
  const prefetch = ({ manifest }: InstalledPlugin) => {
    for (const kind of ['background', 'intent'] as const) {
      if (!manifest.modules.includes(kind)) continue;
      module(manifest.id, kind)
        .then((arrived) => {
          if (kind === 'intent') index(manifest.id, arrived as Intent);
        })
        .catch((err: unknown) => {
          console.warn(
            `plugin ${manifest.id}: its ${kind} module failed to load; ignoring it`,
            err,
          );
        });
    }
  };

  const registerFor = ({ manifest }: InstalledPlugin) => {
    if (!commandTarget) return;
    const { registry, host } = commandTarget;
    const undo: (() => void)[] = [];
    for (const decl of manifest.commands ?? []) {
      const command: Command = {
        name: decl.name,
        title: decl.title,
        description: decl.description,
        source: manifest.id,
        args: decl.args ?? [],
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
      undo.push(registry.register(command));
    }
    unregisters.set(manifest.id, undo);
  };

  for (const plugin of installed) prefetch(plugin);

  return {
    plugins: () =>
      installed.map(({ manifest }) => ({
        id: manifest.id,
        title: manifest.title,
        icon: manifest.icon,
        color: manifest.color,
      })),
    manifest: (id) => byId.get(id)?.manifest,
    manifests: () => installed.map((p) => p.manifest),
    declined: () => declined,
    declaredCommands,
    declaredCalls,
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
    version,
    subscribe,
    registerCommands(registry, host) {
      commandTarget = { registry, host };
      for (const plugin of installed) registerFor(plugin);
    },
    origin: (id) => byId.get(id)?.origin,
    add(plugin) {
      const id = plugin.manifest.id;
      if (byId.has(id)) throw new Error(`plugin ${id} is already installed`);
      installed.push(plugin);
      byId.set(id, plugin);
      registerFor(plugin);
      prefetch(plugin);
      reindex();
      bump();
    },
    remove(id) {
      const plugin = byId.get(id);
      if (!plugin) return;
      for (const undo of unregisters.get(id) ?? []) undo();
      unregisters.delete(id);
      for (const key of [...loaded.keys()]) if (key.startsWith(`${id}/`)) loaded.delete(key);
      for (const key of [...loading.keys()]) if (key.startsWith(`${id}/`)) loading.delete(key);
      installed.splice(installed.indexOf(plugin), 1);
      byId.delete(id);
      reindex();
      bump();
    },
  };
}
