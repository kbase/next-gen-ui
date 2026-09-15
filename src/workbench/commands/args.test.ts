import { describe, expect, it } from 'vitest';
import { completeArg, usage, validateArgs } from './args';
import type { ArgSpec } from './args';

describe('validateArgs', () => {
  it('assigns tokens to args by position', () => {
    const specs: ArgSpec[] = [{ name: 'a' }, { name: 'b' }];
    const result = validateArgs(specs, ['x', 'y']);
    expect(result.ok && result.values).toEqual({ a: 'x', b: 'y' });
  });

  it('leaves an optional trailing arg out of the values when omitted', () => {
    const specs: ArgSpec[] = [{ name: 'a' }, { name: 'b' }];
    const result = validateArgs(specs, ['x']);
    expect(result.ok && result.values).toEqual({ a: 'x' });
  });

  it('fails with missing when a required arg is absent', () => {
    const specs: ArgSpec[] = [{ name: 'a', required: true }];
    const result = validateArgs(specs, []);
    expect(!result.ok && result.error).toEqual({
      code: 'missing',
      arg: 'a',
      message: 'a is required',
    });
  });

  it('fails with too-many when more tokens are given than specs declare', () => {
    const specs: ArgSpec[] = [{ name: 'a' }];
    const result = validateArgs(specs, ['x', 'y']);
    expect(!result.ok && result.error.code).toBe('too-many');
  });
});

describe('completeArg', () => {
  it('offers nothing when the spec has no completer', async () => {
    expect(await completeArg({ name: 'a' }, '')).toEqual([]);
  });

  it('filters the completer results by prefix', async () => {
    const spec: ArgSpec = { name: 'id', complete: () => ['12', '13', '20'] };
    expect(await completeArg(spec, '1')).toEqual(['12', '13']);
  });

  it('awaits an async completer', async () => {
    const spec: ArgSpec = { name: 'id', complete: async () => ['a', 'b'] };
    expect(await completeArg(spec, 'a')).toEqual(['a']);
  });
});

describe('usage', () => {
  it('brackets a required arg with angle brackets and an optional one with square brackets', () => {
    const specs: ArgSpec[] = [{ name: 'id', required: true }, { name: 'note' }];
    expect(usage('cancel', specs)).toBe('/cancel <id> [note]');
  });

  it('is just the command name when there are no args', () => {
    expect(usage('open', [])).toBe('/open');
  });
});
