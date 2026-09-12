import type { PluginId } from '../core';
import type { ArgSpec, ArgValues } from './args';

// Who ran the command: the plugin whose code called `execute`, or 'user'
// for the prompt bar, a keybinding and every button.
export type Caller = 'user' | PluginId;

export interface CommandSpec {
  // The bare name: `close`, `cancel`. Registered as "<source>:<name>",
  // which is unique across the registry; the bare name need not be.
  name: string;
  title: string;
  description?: string;
  args?: ArgSpec[];
  // 'workbench' or the plugin that declared it.
  source: 'workbench' | PluginId;
}

export interface Command extends CommandSpec {
  // Every registered command is findable and runnable at any moment; a
  // command the layout leaves nothing to do announces why rather than
  // returning silently. Nothing hides a command from the prompt bar that
  // would still run from its keybinding.
  run: (values: ArgValues, caller: Caller) => void | Promise<void>;
}

export const qualifiedName = (command: Pick<CommandSpec, 'name' | 'source'>): string =>
  `${command.source}:${command.name}`;

export type Found =
  | { ok: true; command: Command }
  | { ok: false; reason: 'unknown' | 'ambiguous'; candidates: Command[] };

export interface CommandRegistry {
  register(command: Command): () => void;
  // By qualified name only.
  get(name: string): Command | undefined;
  // By qualified name, or by a bare name that exactly one command carries.
  find(name: string): Found;
  list(): Command[];
  run(name: string, values: ArgValues, caller?: Caller): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export class DuplicateCommandError extends Error {
  constructor(name: string) {
    super(`command /${name} is already registered`);
    this.name = 'DuplicateCommandError';
  }
}

export function createCommandRegistry(): CommandRegistry {
  const commands = new Map<string, Command>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const list = () =>
    [...commands.values()].sort((a, b) => qualifiedName(a).localeCompare(qualifiedName(b)));

  const find = (name: string): Found => {
    const exact = commands.get(name);
    if (exact) return { ok: true, command: exact };
    if (name.includes(':')) return { ok: false, reason: 'unknown', candidates: [] };
    const candidates = list().filter((c) => c.name === name);
    if (candidates.length === 1) return { ok: true, command: candidates[0] };
    return { ok: false, reason: candidates.length ? 'ambiguous' : 'unknown', candidates };
  };

  return {
    register(command) {
      const key = qualifiedName(command);
      if (commands.has(key)) throw new DuplicateCommandError(key);
      commands.set(key, command);
      notify();
      return () => {
        if (commands.get(key) === command) {
          commands.delete(key);
          notify();
        }
      };
    },
    get: (name) => commands.get(name),
    find,
    list,
    async run(name, values, caller = 'user') {
      const found = find(name);
      if (!found.ok) {
        throw new Error(
          found.reason === 'ambiguous'
            ? `/${name} is declared by ${found.candidates.map(qualifiedName).join(' and ')}`
            : `unknown command /${name}`,
        );
      }
      await found.command.run(values, caller);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
