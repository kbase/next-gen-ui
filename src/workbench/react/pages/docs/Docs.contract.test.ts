import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// The Docs page restates the SDK's types by hand, so this compares the two and
// fails when they part company.
//
// What it compares, per `Sig` block: every type the block declares must be a
// type the SDK exports under that name, and the two must agree on the *shape* —
// the set of member names and which of them are optional, one level down into
// any member the page wrote as an object literal, a function type or an array
// of object literals, and the set of string literals in a union. Function
// declarations are compared on parameter count, and on parameter names where
// the SDK's own name is longer than one letter (`defineIntent(i)` names
// nothing, so the page may call it what it likes; `index(commands, calls)`
// does, so the page has to use it).
//
// What it does not compare: member types (`Record<string, string>` against
// `Record<string, number>` passes), return types, anything the page says in
// prose or in a `when=` schedule, and the example code in the `File` blocks.
// Those are where the page's real content is, and a check that could read them
// would be a check on English. It also cannot see a member the page documents
// in prose alone; the coverage test at the end is the counterweight, since a
// type the SDK exports and the page never names is a hole it can point at.

// jsdom's URL resolves a relative base against the document, so the paths are
// built with `path` from this file's own location.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../../..');
const SDK = join(ROOT, 'src/plugins/sdk');
const SDK_ENTRIES = [join(SDK, 'index.ts'), join(SDK, 'build', 'pluginFederation.ts')];

// Types the SDK exports that the page deliberately does not name. Each one is
// a decision: delete the line to make the check demand a passage for it.
const UNDOCUMENTED: Record<string, string> = {
  ArgValues: "a command's arguments, written out as Record<string, string> at every signature",
  Caller: "the caller a handler reads, written out as `caller: string` in CommandContext",
  PanelState: 'what a panel knows about itself, documented as the first five fields of PanelHandle',
  Modules: 'the host-side map from module name to module; a plugin writes one module at a time',
  PanelKind: "written out as 'route' | 'pane' inside PanelHandle, the only place a plugin meets it",
  PluginFederationOptions: "pluginFederation's argument, written out at its own reference entry",
};

interface Problem {
  member: string;
  says: string;
}

// One program over the SDK's two public entry points: `index.ts`, what a
// plugin imports, and `pluginFederation.ts`, what its vite.config does. The
// checker is what makes `Manifest` readable at all — it is inferred from a zod
// schema, so there is no interface in the source to read members off.
const program = ts.createProgram(
  SDK_ENTRIES,
  (() => {
    const file = ts.readConfigFile(join(ROOT, 'tsconfig.json'), ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(file.config, ts.sys, ROOT);
    return { ...parsed.options, noEmit: true, types: [] };
  })(),
);
const checker = program.getTypeChecker();

const sdkExports = new Map<string, ts.Symbol>();
for (const entry of SDK_ENTRIES) {
  const file = program.getSourceFile(entry);
  const symbol = file && checker.getSymbolAtLocation(file);
  if (!symbol) throw new Error(`the SDK entry ${entry} did not resolve`);
  for (const exported of checker.getExportsOfModule(symbol)) {
    sdkExports.set(exported.getName(), exported);
  }
}

function unalias(symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

// The type a name stands for: the declared type for an interface or a type
// alias, and the type of the value for a function.
function sdkTypeOf(name: string): ts.Type | undefined {
  const found = sdkExports.get(name);
  if (!found) return undefined;
  const symbol = unalias(found);
  if (symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
    return checker.getDeclaredTypeOfSymbol(symbol);
  }
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  return declaration ? checker.getTypeOfSymbolAtLocation(symbol, declaration) : undefined;
}

function typeOfMember(symbol: ts.Symbol): ts.Type | undefined {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!declaration) return undefined;
  // Optional members carry `| undefined` under strictNullChecks; the page
  // writes the `?` and then the type it would be.
  return checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(symbol, declaration));
}

// The string literals a union is made of, or undefined when it is made of
// anything else.
function literalsOf(type: ts.Type): string[] | undefined {
  const parts = type.isUnion() ? type.types : [type];
  const values = parts.map((part) => (part.isStringLiteral() ? part.value : undefined));
  return values.every((v) => v !== undefined) ? (values as string[]).sort() : undefined;
}

function nodeLiterals(node: ts.TypeNode): string[] | undefined {
  const parts = ts.isUnionTypeNode(node) ? node.types : [node];
  const values = parts.map((part) =>
    ts.isLiteralTypeNode(part) && ts.isStringLiteral(part.literal) ? part.literal.text : undefined,
  );
  return values.every((v) => v !== undefined) ? (values as string[]).sort() : undefined;
}

interface DocsShape {
  members: ts.TypeElement[];
  // Member names contributed by a type the page names rather than spells out —
  // `interface Offer extends CommandCall`. Checked under that type's own name.
  inherited: Set<string>;
}

function inheritedFrom(node: ts.TypeNode | ts.ExpressionWithTypeArguments): Set<string> {
  const name = ts.isExpressionWithTypeArguments(node)
    ? ts.isIdentifier(node.expression)
      ? node.expression.text
      : undefined
    : ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)
      ? node.typeName.text
      : undefined;
  const type = name ? sdkTypeOf(name) : undefined;
  return new Set(type ? checker.getPropertiesOfType(type).map((p) => p.getName()) : []);
}

function shapeOf(node: ts.TypeNode): DocsShape {
  if (ts.isTypeLiteralNode(node)) return { members: [...node.members], inherited: new Set() };
  if (ts.isIntersectionTypeNode(node)) {
    const shape: DocsShape = { members: [], inherited: new Set() };
    for (const part of node.types) {
      const inner = shapeOf(part);
      shape.members.push(...inner.members);
      for (const name of inner.inherited) shape.inherited.add(name);
    }
    return shape;
  }
  if (ts.isTypeReferenceNode(node)) return { members: [], inherited: inheritedFrom(node) };
  return { members: [], inherited: new Set() };
}

function compareShape(where: string, shape: DocsShape, sdkType: ts.Type, found: Problem[]) {
  const properties = new Map(checker.getPropertiesOfType(sdkType).map((p) => [p.getName(), p]));
  const written = new Set<string>();
  for (const member of shape.members) {
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    const name = member.name.text;
    written.add(name);
    const property = properties.get(name);
    if (!property) {
      found.push({ member: `${where}.${name}`, says: 'the page has it; the SDK does not' });
      continue;
    }
    const optionalInSdk = (property.flags & ts.SymbolFlags.Optional) !== 0;
    if (optionalInSdk !== (member.questionToken !== undefined)) {
      found.push({
        member: `${where}.${name}`,
        says: optionalInSdk ? 'the SDK has it optional' : 'the SDK has it required',
      });
    }
    const asWritten = ts.isPropertySignature(member) ? member.type : undefined;
    const actual = typeOfMember(property);
    if (asWritten && actual) compareNode(`${where}.${name}`, asWritten, actual, found);
  }
  for (const name of properties.keys()) {
    if (written.has(name) || shape.inherited.has(name)) continue;
    found.push({ member: `${where}.${name}`, says: 'the SDK has it; the page does not' });
  }
}

// The page states one signature; an overloaded function is stated truly by
// any of them, so a match against one is a match. Where none matches, the
// complaint is the one from the signature of the same arity, because that is
// the overload the page was writing about.
function compareParameters(
  where: string,
  parameters: readonly ts.ParameterDeclaration[],
  signatures: readonly ts.Signature[],
  found: Problem[],
) {
  if (signatures.length === 0) {
    found.push({ member: where, says: 'the page writes a function; the SDK type is not callable' });
    return;
  }
  const tries = signatures.map((signature) => {
    const problems: Problem[] = [];
    compareSignature(where, parameters, signature, problems);
    return problems;
  });
  if (tries.some((problems) => problems.length === 0)) return;
  const sameArity = signatures.findIndex((s) => s.parameters.length === parameters.length);
  found.push(...tries[sameArity === -1 ? 0 : sameArity]);
}

function compareSignature(
  where: string,
  parameters: readonly ts.ParameterDeclaration[],
  signature: ts.Signature,
  found: Problem[],
) {
  if (signature.parameters.length !== parameters.length) {
    found.push({
      member: where,
      says: `the page gives it ${parameters.length} parameter(s); the SDK takes ${signature.parameters.length}`,
    });
    return;
  }
  parameters.forEach((written, i) => {
    const actual = signature.parameters[i];
    const name = actual.getName();
    // A one-letter parameter, or one the compiler named for a destructuring
    // pattern, says nothing the page has to repeat.
    if (
      name.length > 1 &&
      !name.startsWith('__') &&
      ts.isIdentifier(written.name) &&
      written.name.text !== name
    ) {
      found.push({
        member: `${where}(${i})`,
        says: `the page calls it ${written.name.text}; the SDK calls it ${name}`,
      });
    }
    const type = written.type;
    const actualType = typeOfMember(actual);
    // Named as the page names it: a destructured parameter has no name in the
    // SDK, and `__0` in the message would send the reader to the wrong file.
    const label = ts.isIdentifier(written.name) ? written.name.text : name;
    if (type && actualType) compareNode(`${where}(${label})`, type, actualType, found);
  });
}

// One level of the page's own writing against the type behind it. Anything the
// page wrote as a bare name is left to that name's own entry.
function compareNode(where: string, node: ts.TypeNode, sdkType: ts.Type, found: Problem[]) {
  if (ts.isTypeLiteralNode(node)) {
    compareShape(where, shapeOf(node), sdkType, found);
    return;
  }
  if (ts.isFunctionTypeNode(node)) {
    compareParameters(where, node.parameters, sdkType.getCallSignatures(), found);
    return;
  }
  if (ts.isArrayTypeNode(node) && ts.isTypeLiteralNode(node.elementType)) {
    const element = checker.getIndexTypeOfType(sdkType, ts.IndexKind.Number);
    if (element) compareNode(`${where}[]`, node.elementType, element, found);
    return;
  }
  const written = nodeLiterals(node);
  const actual = literalsOf(sdkType);
  if (written && actual && written.join(' | ') !== actual.join(' | ')) {
    found.push({
      member: where,
      says: `the page says ${written.join(' | ')}; the SDK says ${actual.join(' | ')}`,
    });
  }
}

function compareDeclaration(node: ts.Statement, found: Problem[]) {
  const named = (name: string): ts.Type | undefined => {
    const type = sdkTypeOf(name);
    if (!type)
      found.push({ member: name, says: 'the page declares it; the SDK exports no such name' });
    return type;
  };
  if (ts.isInterfaceDeclaration(node)) {
    const type = named(node.name.text);
    if (!type) return;
    const inherited = new Set<string>();
    for (const clause of node.heritageClauses ?? []) {
      for (const parent of clause.types) for (const n of inheritedFrom(parent)) inherited.add(n);
    }
    compareShape(node.name.text, { members: [...node.members], inherited }, type, found);
    return;
  }
  if (ts.isTypeAliasDeclaration(node)) {
    const type = named(node.name.text);
    if (!type) return;
    if (ts.isTypeLiteralNode(node.type) || ts.isIntersectionTypeNode(node.type)) {
      compareShape(node.name.text, shapeOf(node.type), type, found);
      return;
    }
    compareNode(node.name.text, node.type, type, found);
    return;
  }
  if (ts.isFunctionDeclaration(node) && node.name) {
    const type = named(node.name.text);
    if (!type) return;
    compareParameters(node.name.text, node.parameters, type.getCallSignatures(), found);
  }
}

// Each `Sig` block, under the id of the reference entry it sits in.
function signatureBlocks(): { block: string; code: string }[] {
  const page = readFileSync(join(HERE, 'Docs.tsx'), 'utf8');
  const blocks: { block: string; code: string }[] = [];
  const sig = /<Sig>\{`([\s\S]*?)`\}<\/Sig>/g;
  let match: RegExpExecArray | null;
  while ((match = sig.exec(page)) !== null) {
    const before = page.slice(0, match.index);
    const id = [...before.matchAll(/id="([^"]+)"/g)].at(-1);
    blocks.push({ block: id ? id[1] : `at ${match.index}`, code: match[1] });
  }
  return blocks;
}

const blocks = signatureBlocks();

describe('the Docs page against the SDK', () => {
  it('has signature blocks to check', () => {
    expect(blocks.length).toBeGreaterThan(8);
  });

  it.each(blocks.map((b) => [b.block, b.code] as const))('%s states the SDK', (block, code) => {
    const parsed = ts.createSourceFile(`${block}.ts`, code, ts.ScriptTarget.Latest, true);
    const found: Problem[] = [];
    for (const statement of parsed.statements) compareDeclaration(statement, found);
    const report = found.map((p) => `  ${p.member}: ${p.says}`).join('\n');
    expect(
      found.length === 0,
      `the ${block} block and the SDK disagree:\n${report}\n\nThe SDK is the contract: fix the page, or fix the SDK and then the page.`,
    ).toBe(true);
  });

  it('names every type the SDK exports', () => {
    const page = readFileSync(join(HERE, 'Docs.tsx'), 'utf8');
    const missing: string[] = [];
    for (const [name, symbol] of sdkExports) {
      const resolved = unalias(symbol);
      const isType = resolved.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias);
      if (!isType || name in UNDOCUMENTED) continue;
      if (!new RegExp(`\\b${name}\\b`).test(page)) missing.push(name);
    }
    expect(
      missing.length === 0,
      `the SDK exports ${missing.join(', ')} and the Docs page never names ${
        missing.length === 1 ? 'it' : 'them'
      }. Document the type, or record the reason in UNDOCUMENTED.`,
    ).toBe(true);
  });
});
