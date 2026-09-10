import { describe, expect, it } from 'vitest';
import { SDK_VERSION, ManifestSchema, qualifyCommand } from './contract';

const base = { id: 'jobs', title: 'Jobs', sdkVersion: SDK_VERSION, modules: [] };

describe('ManifestSchema', () => {
  it('accepts a minimal manifest', () => {
    expect(ManifestSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    ['an uppercase id', { ...base, id: 'Jobs' }],
    ['an id with a slash', { ...base, id: 'a/b' }],
    ['an SDK version the host does not load', { ...base, sdkVersion: '0.0.0' }],
    ['a module the host does not know', { ...base, modules: ['matcher'] }],
    ['no module list', { id: 'x', title: 'x', sdkVersion: SDK_VERSION }],
    ['a command name with spaces', { ...base, commands: [{ name: 'do it', title: 'x' }] }],
    ['a call to a command with a slash', { ...base, launcher: { label: 'x', command: '/open' } }],
  ])('rejects %s', (_label, raw) => {
    expect(ManifestSchema.safeParse(raw).success).toBe(false);
  });

  it('accepts a full manifest', () => {
    const result = ManifestSchema.safeParse({
      ...base,
      icon: 'Gear',
      modules: ['background', 'route', 'pane', 'commands', 'prompt'],
      commands: [
        {
          name: 'cancel',
          title: 'Cancel a job',
          args: [{ name: 'id', required: true }],
        },
      ],
      shortcuts: [{ label: 'Cancel 12', command: 'cancel', args: { id: '12' } }],
      launcher: { label: 'Jobs', command: 'workbench:open', args: { plugin: 'jobs' } },
    });
    expect(result.success).toBe(true);
  });
});

describe('qualifyCommand', () => {
  it('gives a bare name to its owner and leaves a qualified one alone', () => {
    expect(qualifyCommand('cancel', 'jobs')).toBe('jobs:cancel');
    expect(qualifyCommand('genknown:taxon', 'jobs')).toBe('genknown:taxon');
  });
});
