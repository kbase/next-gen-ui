import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// The SDK's exported surface against the version it declares. The contract
// says additions move the minor and removals the major, and below 1.0.0 a
// minor carries the weight of a major; the version is typed by hand, so
// nothing held the two together. This does: `surface.json` records the
// surface at the version that last changed it, and a surface that differs
// from the record has to come with a version bump of the right size.
//
// To take a change: bump src/plugins/sdk/package.json, then
//   SDK_SURFACE_WRITE=1 npx vitest run --dir src src/plugins/sdk/surface.test.ts
//
// Three surfaces, because a plugin touches all three: the runtime values
// index.ts re-exports, the type names it re-exports, and the members of each
// exported interface or object type, which is where a contract actually moves.

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const ENTRIES = [join(HERE, 'index.ts'), join(HERE, 'pluginFederation.ts')];
const RECORD = join(HERE, 'surface.json');

interface Surface {
  version: string;
  values: string[];
  types: string[];
  members: Record<string, string[]>;
}

function current(): Surface {
  const file = ts.readConfigFile(join(ROOT, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(file.config, ts.sys, ROOT);
  const program = ts.createProgram(ENTRIES, { ...parsed.options, noEmit: true, types: [] });
  const checker = program.getTypeChecker();
  const values = new Set<string>();
  const types = new Set<string>();
  const members: Record<string, string[]> = {};
  for (const entry of ENTRIES) {
    const source = program.getSourceFile(entry);
    const symbol = source && checker.getSymbolAtLocation(source);
    if (!symbol) throw new Error(`the SDK entry ${entry} did not resolve`);
    for (const exported of checker.getExportsOfModule(symbol)) {
      const name = exported.getName();
      const resolved =
        exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const isType = (resolved.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) !== 0;
      const isValue = (resolved.flags & ts.SymbolFlags.Value) !== 0;
      if (isValue) values.add(name);
      if (isType) {
        types.add(name);
        const type = checker.getDeclaredTypeOfSymbol(resolved);
        const props = checker
          .getPropertiesOfType(type)
          .map((p) => `${p.getName()}${p.flags & ts.SymbolFlags.Optional ? '?' : ''}`)
          .sort();
        if (props.length) members[name] = props;
      }
    }
  }
  const version = (JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8')) as { version: string })
    .version;
  return { version, values: [...values].sort(), types: [...types].sort(), members };
}

const gone = (a: string[], b: string[]) => a.filter((x) => !b.includes(x));

// What moved between two surfaces, as lines a reader can act on.
function changes(recorded: Surface, now: Surface): { removed: string[]; added: string[] } {
  const removed: string[] = [];
  const added: string[] = [];
  for (const kind of ['values', 'types'] as const) {
    removed.push(...gone(recorded[kind], now[kind]).map((n) => `${kind}: ${n}`));
    added.push(...gone(now[kind], recorded[kind]).map((n) => `${kind}: ${n}`));
  }
  for (const name of new Set([...Object.keys(recorded.members), ...Object.keys(now.members)])) {
    const before = recorded.members[name] ?? [];
    const after = now.members[name] ?? [];
    removed.push(...gone(before, after).map((m) => `${name}.${m}`));
    added.push(...gone(after, before).map((m) => `${name}.${m}`));
  }
  return { removed, added };
}

const parts = (v: string) => v.split('.').map(Number);

describe('the SDK surface against its declared version', () => {
  const now = current();

  it('is recorded', () => {
    if (process.env.SDK_SURFACE_WRITE) {
      writeFileSync(RECORD, JSON.stringify(now, null, 2) + '\n');
    }
    expect(() => readFileSync(RECORD)).not.toThrow();
  });

  it('moved the version by what the surface change calls for', () => {
    if (process.env.SDK_SURFACE_WRITE) return;
    const recorded = JSON.parse(readFileSync(RECORD, 'utf8')) as Surface;
    const { removed, added } = changes(recorded, now);
    if (removed.length === 0 && added.length === 0) return;

    const [major, minor] = parts(now.version);
    const [wasMajor, wasMinor] = parts(recorded.version);
    // Below 1.0.0 the minor is the whole contract, so any change moves it;
    // from 1.0.0 a removal moves the major and an addition the minor.
    const needed =
      major === 0 || wasMajor === 0
        ? [minor !== wasMinor || major !== wasMajor, 'the minor']
        : removed.length
          ? [major !== wasMajor, 'the major']
          : [major !== wasMajor || minor !== wasMinor, 'the minor'];
    const report = [
      ...removed.map((r) => `  removed ${r}`),
      ...added.map((a) => `  added   ${a}`),
    ].join('\n');
    expect(
      needed[0],
      `the SDK's surface differs from surface.json (recorded at ${recorded.version}) and ${now.version} does not move ${needed[1]}:\n${report}\n\nBump src/plugins/sdk/package.json, then refresh the record with SDK_SURFACE_WRITE=1.`,
    ).toBe(true);
  });
});
