import type { ArgError, ArgValues } from './args';
import { completeArg, usage, validateArgs } from './args';
import type { Command, CommandContext, CommandRegistry } from './registry';

// Text typed into the prompt bar is either a slash command or a prompt for
// the assistant. Slash commands are `/name arg arg`, with double quotes
// grouping an argument that contains spaces.

export type Parsed =
  | { kind: 'prompt'; text: string }
  | { kind: 'command'; name: string; tokens: string[]; trailingSpace: boolean };

export function parse(input: string): Parsed {
  if (!input.startsWith('/')) return { kind: 'prompt', text: input };
  const body = input.slice(1);
  const tokens = tokenize(body);
  const name = tokens.shift() ?? '';
  return { kind: 'command', name, tokens, trailingSpace: /\s$/.test(body) };
}

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"?|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) tokens.push(match[1] ?? match[2]);
  return tokens;
}

export type Resolved =
  | { ok: true; command: Command; values: ArgValues }
  | { ok: false; code: 'unknown-command' | ArgError['code']; message: string };

export function resolve(registry: CommandRegistry, input: string, ctx?: CommandContext): Resolved {
  const parsed = parse(input);
  if (parsed.kind !== 'command') {
    return { ok: false, code: 'unknown-command', message: 'not a slash command' };
  }
  const command = registry.get(parsed.name);
  if (!command || (ctx && command.when && !command.when(ctx))) {
    return { ok: false, code: 'unknown-command', message: `unknown command /${parsed.name}` };
  }
  const result = validateArgs(command.args ?? [], parsed.tokens);
  if (!result.ok) return { ok: false, code: result.error.code, message: result.error.message };
  return { ok: true, command, values: result.values };
}

export interface Suggestion {
  // What replaces the input when accepted.
  value: string;
  label: string;
  detail?: string;
}

// Completions for the token under the caret, which is always the last one.
export async function complete(
  registry: CommandRegistry,
  input: string,
  ctx?: CommandContext,
): Promise<Suggestion[]> {
  const parsed = parse(input);
  if (parsed.kind !== 'command') return [];

  const namingCommand = parsed.tokens.length === 0 && !parsed.trailingSpace;
  if (namingCommand) {
    return registry
      .list(ctx)
      .filter((c) => c.name.startsWith(parsed.name))
      .map((c) => ({
        value: `/${c.name}${c.args?.length ? ' ' : ''}`,
        label: usage(c.name, c.args ?? []),
        detail: c.title,
      }));
  }

  const command = registry.get(parsed.name);
  if (!command || (ctx && command.when && !command.when(ctx))) return [];
  const specs = command.args ?? [];
  const index = parsed.trailingSpace ? parsed.tokens.length : parsed.tokens.length - 1;
  const spec = specs[index];
  if (!spec) return [];
  const prefix = parsed.trailingSpace ? '' : (parsed.tokens[index] ?? '');
  const done = parsed.tokens.slice(0, index);
  const options = await completeArg(spec, prefix);
  return options.map((option) => ({
    value: ['/' + command.name, ...done.map(quote), quote(option)].join(' '),
    label: option,
    detail: spec.description ?? spec.name,
  }));
}

function quote(token: string): string {
  return /\s/.test(token) ? `"${token}"` : token;
}
