import type { ArgError, ArgValues } from './args';
import { completeArg, usage, validateArgs } from './args';
import type { Command, CommandRegistry } from './registry';
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

export function resolve(registry: CommandRegistry, input: string): Resolved {
  const parsed = parse(input);
  if (parsed.kind !== 'command') {
    return { ok: false, code: 'unknown-command', message: 'not a slash command' };
  }
  const found = registry.find(parsed.name);
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

// A way of finishing the text in the bar: what the input becomes when the row
// is accepted. Not an SDK `Suggestion`, which is a call an intent ranked and
// the bar runs — this one types for the user and runs nothing.
export interface Completion {
  // What replaces the input when accepted.
  value: string;
  label: string;
  detail?: string;
  // The command this suggestion completes, for a caller that needs more
  // than the label — its icon, say — without re-parsing `value`.
  command: Command;
}

// The shortest name that reaches a command: bare when no other command
// carries that bare name, qualified otherwise.
export function displayName(registry: CommandRegistry, command: Command): string {
  const sharers = registry.list().filter((c) => c.name === command.name);
  return sharers.length > 1 ? qualifiedName(command) : command.name;
}

// Completions for the token under the caret, which is always the last one.
// Every registered command is offered: whether one can act on the layout as
// it stands is answered by running it, which is also the only moment a
// keybinding passes through.
export async function complete(registry: CommandRegistry, input: string): Promise<Completion[]> {
  const parsed = parse(input);
  if (parsed.kind !== 'command') return [];

  // The name is still being typed while there is no argument after it, or
  // while what is typed names no command — `/new ` is a space after a name
  // that has not resolved, and the names are what to offer for it.
  const found = registry.find(parsed.name);
  const namingCommand = parsed.tokens.length === 0 && (!parsed.trailingSpace || !found.ok);
  if (namingCommand) {
    // Anywhere in the name, not only at its start: `/question` reaches
    // `/new-question`. A name the text begins comes before one it falls
    // inside, each group in the registry's order. A part of the bare name
    // reaches a contested command too, shown in the qualified form the user
    // will have to type.
    const starts = ({ c, shown }: { c: Command; shown: string }) =>
      [shown, c.name, qualifiedName(c)].some((n) => n.startsWith(parsed.name));
    // Inside the bare name only: the qualified form's plugin prefix is not
    // what a reader is typing from the middle of.
    const within = ({ c }: { c: Command }) => c.name.includes(parsed.name);
    const candidates = registry.list().map((c) => ({ c, shown: displayName(registry, c) }));
    return [...candidates.filter(starts), ...candidates.filter((x) => !starts(x) && within(x))]
      .map(({ c, shown }) => ({
        // The trailing space invites the argument that has to follow. A
        // command whose arguments are all optional is already whole, and
        // the space would only make Enter retype the line instead of
        // running it.
        value: `/${shown}${c.args?.some((a) => a.required) ? ' ' : ''}`,
        label: usage(shown, c.args ?? []),
        detail: c.title,
        command: c,
      }));
  }

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
    command: found.command,
  }));
}

function quote(token: string): string {
  return /\s/.test(token) ? `"${token}"` : token;
}
