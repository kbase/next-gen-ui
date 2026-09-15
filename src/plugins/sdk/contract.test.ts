import { describe, expect, it } from 'vitest';
import { SDK_VERSION, ManifestSchema, acceptsSdkVersion, qualifyCommand } from './contract';

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

describe('acceptsSdkVersion', () => {
  it.each([
    ['the same version', '1.2.0', '1.2.0'],
    ['a later patch of the same minor', '1.2.9', '1.2.0'],
    ['an earlier minor of the same major', '1.1.7', '1.2.0'],
    ['0.0.x against a 0.0.x workbench', '0.0.3', '0.0.1'],
  ])('loads %s', (_label, declared, host) => {
    expect(acceptsSdkVersion(declared, host)).toBe(true);
  });

  it.each([
    ['a later minor, which may import what the workbench does not serve', '1.3.0', '1.2.0'],
    ['another major', '2.0.0', '1.2.0'],
    ['an earlier major', '0.2.0', '1.2.0'],
    // Under 0.x a minor carries what a major carries after 1.0.
    ['an earlier 0.x minor', '0.1.0', '0.2.0'],
    ['a later 0.x minor', '0.3.0', '0.2.0'],
    ['a two-part version', '1.2', '1.2.0'],
    ['a v prefix', 'v1.2.0', '1.2.0'],
    ['a prerelease', '1.2.0-rc.1', '1.2.0'],
    ['a range', '^1.2.0', '1.2.0'],
    ['an empty string', '', '1.2.0'],
    ['anything at all when the workbench version is unreadable', '1.2.0', 'dev'],
  ])('does not load %s', (_label, declared, host) => {
    expect(acceptsSdkVersion(declared, host)).toBe(false);
  });

  it('defaults to the SDK this workbench was built from', () => {
    expect(acceptsSdkVersion(SDK_VERSION)).toBe(true);
  });
});

describe('the manifest SDK version', () => {
  // The one build in the wild that declares it: the frozen canopy FJ.
  it('rejects 0.1.0 and says what is loaded instead', () => {
    const result = ManifestSchema.safeParse({ ...base, sdkVersion: '0.1.0' });
    expect(result.success).toBe(false);
    const issue = result.error!.issues.find((i) => i.path[0] === 'sdkVersion');
    expect(issue?.message).toContain(SDK_VERSION);
  });

  it.each([
    ['missing', { id: 'jobs', title: 'Jobs', modules: [] }],
    ['not a string', { ...base, sdkVersion: 2 }],
  ])('reports a %s sdkVersion against the sdkVersion field', (_label, raw) => {
    const result = ManifestSchema.safeParse(raw);
    expect(result.success).toBe(false);
    expect(result.error!.issues.some((i) => i.path[0] === 'sdkVersion')).toBe(true);
  });
});

describe('qualifyCommand', () => {
  it('gives a bare name to its owner and leaves a qualified one alone', () => {
    expect(qualifyCommand('cancel', 'jobs')).toBe('jobs:cancel');
    expect(qualifyCommand('genknown:taxon', 'jobs')).toBe('genknown:taxon');
  });
});
