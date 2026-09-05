import type { PanelKind, PluginId } from '../core';
import type { ArgSpec, ArgValues } from './args';

// What a command may ask about before deciding it applies. Kept tiny on
// purpose; a `when` is a function, not a grammar.
export interface CommandContext {
  focusKind: PanelKind | null;
}

export interface CommandSpec {
  // The slash name: `/close`, `/cancel`. Unique across the registry.
  name: string;
  title: string;
  description?: string;
  args?: ArgSpec[];
  when?: (ctx: CommandContext) => boolean;
  // 'workbench' or the plugin that declared it.
  source: 'workbench' | PluginId;
}

export interface Command extends CommandSpec {
  run: (values: ArgValues) => void | Promise<void>;
}

export interface CommandRegistry {
  register(command: Command): () => void;
  get(name: string): Command | undefined;
  list(ctx?: CommandContext): Command[];
  run(name: string, values: ArgValues): Promise<void>;
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

  return {
    register(command) {
      if (commands.has(command.name)) throw new DuplicateCommandError(command.name);
      commands.set(command.name, command);
      notify();
      return () => {
        if (commands.get(command.name) === command) {
          commands.delete(command.name);
          notify();
        }
      };
    },
    get: (name) => commands.get(name),
    list(ctx) {
      const all = [...commands.values()].sort((a, b) => a.name.localeCompare(b.name));
      return ctx ? all.filter((c) => !c.when || c.when(ctx)) : all;
    },
    async run(name, values) {
      const command = commands.get(name);
      if (!command) throw new Error(`unknown command /${name}`);
      await command.run(values);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
