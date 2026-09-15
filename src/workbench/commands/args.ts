// Typed command arguments. Specs are data so the prompt bar can complete
// and validate a slash command before the code that runs it has loaded.

import type { ArgDecl } from '@kbase/plugin-sdk';

export type Completer = (prefix: string) => string[] | Promise<string[]>;

export type ArgSpec = ArgDecl & { complete?: Completer };

export type ArgValue = string;
export type ArgValues = Record<string, ArgValue>;

export type ArgErrorCode = 'missing' | 'too-many';

export interface ArgError {
  code: ArgErrorCode;
  arg?: string;
  message: string;
}

export type ArgResult = { ok: true; values: ArgValues } | { ok: false; error: ArgError };

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
    values[spec.name] = token;
  }
  return { ok: true, values };
}

function fail(code: ArgErrorCode, arg: string | undefined, message: string): ArgResult {
  return { ok: false, error: { code, arg, message } };
}

export async function completeArg(spec: ArgSpec, prefix: string): Promise<string[]> {
  const pool = spec.complete ? await spec.complete(prefix) : [];
  return pool.filter((c) => c.startsWith(prefix));
}

// The usage line shown while the user is still typing: `/cancel <id>`.
export function usage(name: string, specs: ArgSpec[]): string {
  const parts = specs.map((s) => (s.required ? `<${s.name}>` : `[${s.name}]`));
  return ['/' + name, ...parts].join(' ');
}
