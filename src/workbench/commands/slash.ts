import type { ArgError, ArgValues } from './args';
import { completeArg, usage, validateArgs } from './args';
import type { Command, CommandRegistry, WhenContext } from './registry';
import { qualifiedName } from './registry';

// Text typed into the prompt bar is either a slash command or a prompt for
// the assistant. Slash commands are `/name arg arg`, with double quotes
// grouping an argument that contains spaces. The name is bare (`/cancel`)
// when one command carries it, qualified (`/jobs:cancel`) when the user
// has to say which.

export type Parsed =
  | { kind: 'prompt'; text: string }
  | { kind: 'command'; name: string; tokens: string[]; trailingSpace: boolean };

export function parse(input: string): Parsed {
  if (!input.startsWith('/')) return { kind: 'prompt', text: input };
  const body = input.slice(1);
  const tokens = tokenize(body);
  // Names are declared lowercase; what was typed is matched regardless of
  // case. Arguments keep theirs: an accession is case-sensitive.
  const name = (tokens.shift() ?? '').toLowerCase();
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
  | {
      ok: false;
      code: 'unknown-command' | 'ambiguous-command' | ArgError['code'];
      message: string;
    };

export function resolve(registry: CommandRegistry, input: string, ctx?: WhenContext): Resolved {
  const parsed = parse(input);
  if (parsed.kind !== 'command') {
    return { ok: false, code: 'unknown-command', message: 'not a slash command' };
  }
  const found = registry.find(parsed.name, ctx);
  if (!found.ok) {
    if (found.reason === 'ambiguous') {
      return {
        ok: false,
        code: 'ambiguous-command',
        message: `/${parsed.name} is declared by ${found.candidates.map(qualifiedName).join(' and ')}; type one of them`,
      };
    }
    return { ok: false, code: 'unknown-command', message: `unknown command /${parsed.name}` };
  }
  const result = validateArgs(found.command.args ?? [], parsed.tokens);
  if (!result.ok) return { ok: false, code: result.error.code, message: result.error.message };
  return { ok: true, command: found.command, values: result.values };
}

export interface Suggestion {
  // What replaces the input when accepted.
  value: string;
  label: string;
  detail?: string;
}

// The shortest name that reaches a command: bare when no other command
// carries that bare name, qualified otherwise.
export function displayName(registry: CommandRegistry, command: Command): string {
  const sharers = registry.list().filter((c) => c.name === command.name);
  return sharers.length > 1 ? qualifiedName(command) : command.name;
}

// Completions for the token under the caret, which is always the last one.
export async function complete(
  registry: CommandRegistry,
  input: string,
  ctx?: WhenContext,
): Promise<Suggestion[]> {
  const parsed = parse(input);
  if (parsed.kind !== 'command') return [];

  const namingCommand = parsed.tokens.length === 0 && !parsed.trailingSpace;
  if (namingCommand) {
    // A prefix of the bare name reaches a contested command too, shown in
    // the qualified form the user will have to type.
    return registry
      .list(ctx)
      .map((c) => ({ c, shown: displayName(registry, c) }))
      .filter(
        ({ c, shown }) =>
          shown.startsWith(parsed.name) ||
          c.name.startsWith(parsed.name) ||
          qualifiedName(c).startsWith(parsed.name),
      )
      .map(({ c, shown }) => ({
        value: `/${shown}${c.args?.length ? ' ' : ''}`,
        label: usage(shown, c.args ?? []),
        detail: c.title,
      }));
  }

  const found = registry.find(parsed.name, ctx);
  if (!found.ok) return [];
  const specs = found.command.args ?? [];
  const index = parsed.trailingSpace ? parsed.tokens.length : parsed.tokens.length - 1;
  const spec = specs[index];
  if (!spec) return [];
  const prefix = parsed.trailingSpace ? '' : (parsed.tokens[index] ?? '');
  const done = parsed.tokens.slice(0, index);
  const options = await completeArg(spec, prefix);
  return options.map((option) => ({
    value: ['/' + parsed.name, ...done.map(quote), quote(option)].join(' '),
    label: option,
    detail: spec.description ?? spec.name,
  }));
}

function quote(token: string): string {
  return /\s/.test(token) ? `"${token}"` : token;
}
