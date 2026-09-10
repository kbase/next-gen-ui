import { describe, expect, it } from 'vitest';
import { complete, parse, resolve, tokenize } from './slash';
import { createCommandRegistry } from './registry';

function registry() {
  const r = createCommandRegistry();
  r.register({ name: 'open', title: 'Open a panel', source: 'workbench', run: () => {} });
  r.register({
    name: 'cancel',
    title: 'Cancel a job',
    source: 'jobs',
    args: [{ name: 'id', type: 'string', required: true, complete: () => ['12', '13', '20'] }],
    run: () => {},
  });
  r.register({
    name: 'customize',
    title: 'Customize',
    source: 'workbench',
    when: (ctx) => ctx.focusKind !== 'pane',
    run: () => {},
  });
  return r;
}

// Two plugins declaring the same bare name, which the registry allows: only
// the qualified name is unique.
function contested() {
  const r = registry();
  r.register({ name: 'open', title: 'Open a dossier', source: 'fj', run: () => {} });
  return r;
}

describe('parse', () => {
  it('matches a command name in any case, and leaves the arguments alone', () => {
    const p = parse('/Cancel P0AEX9');
    expect(p).toMatchObject({ kind: 'command', name: 'cancel', tokens: ['P0AEX9'] });
  });

  it('treats text without a leading slash as a prompt', () => {
    expect(parse('what is nitrogenase')).toEqual({ kind: 'prompt', text: 'what is nitrogenase' });
  });

  it('splits a command into name and tokens and notices a trailing space', () => {
    expect(parse('/cancel 12 ')).toEqual({
      kind: 'command',
      name: 'cancel',
      tokens: ['12'],
      trailingSpace: true,
    });
  });

  it('groups quoted arguments', () => {
    expect(tokenize('a "b c" d')).toEqual(['a', 'b c', 'd']);
    expect(tokenize('"unterminated')).toEqual(['unterminated']);
  });
});

describe('resolve', () => {
  it('returns the command and typed values', () => {
    const result = resolve(registry(), '/cancel 12');
    expect(result.ok && result.values).toEqual({ id: '12' });
  });

  it('accepts the qualified name as well as the bare one', () => {
    const result = resolve(registry(), '/jobs:cancel 12');
    expect(result.ok && result.command.source).toBe('jobs');
  });

  it.each([
    ['/nope', 'unknown-command'],
    ['/cancel', 'missing'],
    ['/open extra', 'too-many'],
  ])('%s fails with %s', (input, code) => {
    const result = resolve(registry(), input);
    expect(!result.ok && result.code).toBe(code);
  });

  it('refuses a bare name two commands carry and names them', () => {
    const result = resolve(contested(), '/open');
    expect(!result.ok && result.code).toBe('ambiguous-command');
    expect(!result.ok && result.message).toMatch(/fj:open and workbench:open/);
    expect(resolve(contested(), '/fj:open').ok).toBe(true);
  });

  it('hides a command whose when-clause is false', () => {
    const result = resolve(registry(), '/customize', { focusKind: 'pane' });
    expect(!result.ok && result.code).toBe('unknown-command');
  });
});

describe('complete', () => {
  it('offers command names for a prefix', async () => {
    const options = await complete(registry(), '/c');
    expect(options.map((o) => o.value)).toEqual(['/cancel ', '/customize']);
    expect(options[0].label).toBe('/cancel <id>');
  });

  it('offers the qualified forms where the bare name is contested', async () => {
    expect((await complete(contested(), '/o')).map((o) => o.value)).toEqual([
      '/fj:open',
      '/workbench:open',
    ]);
    expect((await complete(contested(), '/fj:')).map((o) => o.value)).toEqual(['/fj:open']);
    expect((await complete(contested(), '/workbench:o')).map((o) => o.value)).toEqual([
      '/workbench:open',
    ]);
  });

  it('offers argument values once the name is complete', async () => {
    expect((await complete(registry(), '/cancel ')).map((o) => o.value)).toEqual([
      '/cancel 12',
      '/cancel 13',
      '/cancel 20',
    ]);
    expect((await complete(registry(), '/cancel 1')).map((o) => o.label)).toEqual(['12', '13']);
  });

  it('offers nothing for a prompt or past the last argument', async () => {
    expect(await complete(registry(), 'hello')).toEqual([]);
    expect(await complete(registry(), '/cancel 12 ')).toEqual([]);
  });
});
