import type { z } from 'zod';

// What the host does with a value a plugin's code handed back: check it
// against the SDK's schema for it where it arrives, keep what parses, and
// say what was refused. A plugin that throws is already contained the same
// way, one line naming the plugin; this is the other way a plugin fails.

export function issueText(issues: readonly z.core.$ZodIssue[]): string {
  const [first] = issues;
  if (!first) return 'not the shape the SDK declares';
  const path = first.path.map(String).join('.');
  return path ? `${path}: ${first.message}` : first.message;
}

// The items of `values` that parse. `who` is the plugin as a sentence names
// it — "plugin fj", "the intent plugin" — and `what` is the value as the
// contract names it, so the line reads: plugin fj: an item relate() answered
// with — source.command: expected string; ignoring it.
export function accepted<T>(who: string, what: string, schema: z.ZodType<T>, values: unknown): T[] {
  if (!Array.isArray(values)) {
    console.warn(`${who}: ${what} is not a list; ignoring it`);
    return [];
  }
  const kept: T[] = [];
  for (const value of values) {
    const parsed = schema.safeParse(value);
    if (parsed.success) kept.push(parsed.data);
    else console.warn(`${who}: ${what} — ${issueText(parsed.error.issues)}; ignoring it`);
  }
  return kept;
}
