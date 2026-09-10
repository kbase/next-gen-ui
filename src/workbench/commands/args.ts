// Typed command arguments. Specs are data so the prompt bar can complete
// and validate a slash command before the code that runs it has loaded.

export type Completer = (prefix: string) => string[] | Promise<string[]>;

interface ArgBase {
  name: string;
  description?: string;
  required?: boolean;
}

export type ArgSpec =
  | (ArgBase & { type: 'string'; complete?: Completer })
  | (ArgBase & { type: 'number' })
  | (ArgBase & { type: 'choice'; choices: string[] | (() => string[]) });

export type ArgValue = string | number;
export type ArgValues = Record<string, ArgValue>;

export type ArgErrorCode = 'missing' | 'not-a-number' | 'not-a-choice' | 'too-many';

export interface ArgError {
  code: ArgErrorCode;
  arg?: string;
  message: string;
}

export type ArgResult = { ok: true; values: ArgValues } | { ok: false; error: ArgError };

export function choicesOf(spec: ArgSpec): string[] {
  if (spec.type !== 'choice') return [];
  return typeof spec.choices === 'function' ? spec.choices() : spec.choices;
}

export function validateArgs(specs: ArgSpec[], tokens: string[]): ArgResult {
  if (tokens.length > specs.length) {
    return fail('too-many', undefined, `expected at most ${specs.length} argument(s)`);
  }
  const values: ArgValues = {};
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const token = tokens[i];
    if (token === undefined) {
      if (spec.required) return fail('missing', spec.name, `${spec.name} is required`);
      continue;
    }
    switch (spec.type) {
      case 'string':
        values[spec.name] = token;
        break;
      case 'number': {
        const n = Number(token);
        if (!Number.isFinite(n)) {
          return fail('not-a-number', spec.name, `${spec.name} must be a number`);
        }
        values[spec.name] = n;
        break;
      }
      case 'choice': {
        const choices = choicesOf(spec);
        if (!choices.includes(token)) {
          return fail(
            'not-a-choice',
            spec.name,
            `${spec.name} must be one of ${choices.join(', ')}`,
          );
        }
        values[spec.name] = token;
        break;
      }
    }
  }
  return { ok: true, values };
}

function fail(code: ArgErrorCode, arg: string | undefined, message: string): ArgResult {
  return { ok: false, error: { code, arg, message } };
}

export async function completeArg(spec: ArgSpec, prefix: string): Promise<string[]> {
  const pool =
    spec.type === 'choice'
      ? choicesOf(spec)
      : spec.type === 'string' && spec.complete
        ? await spec.complete(prefix)
        : [];
  return pool.filter((c) => c.startsWith(prefix));
}

// The usage line shown while the user is still typing: `/cancel <id>`.
export function usage(name: string, specs: ArgSpec[]): string {
  const parts = specs.map((s) => (s.required ? `<${s.name}>` : `[${s.name}]`));
  return ['/' + name, ...parts].join(' ');
}
