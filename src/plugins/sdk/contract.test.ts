import { describe, expect, it } from 'vitest';
import { CONTRACT_VERSION, ManifestSchema } from './contract';

const base = { id: 'jobs', title: 'Jobs', contractVersion: CONTRACT_VERSION };

describe('ManifestSchema', () => {
  it('accepts a minimal manifest', () => {
    expect(ManifestSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    ['an uppercase id', { ...base, id: 'Jobs' }],
    ['an id with a slash', { ...base, id: 'a/b' }],
    ['another contract version', { ...base, contractVersion: 2 }],
    ['a route without a leading slash', { ...base, document: { route: 'job/$id' } }],
    ['a command name with spaces', { ...base, commands: [{ name: 'do it', title: 'x' }] }],
  ])('rejects %s', (_label, raw) => {
    expect(ManifestSchema.safeParse(raw).success).toBe(false);
  });

  it('accepts a full manifest', () => {
    const result = ManifestSchema.safeParse({
      ...base,
      icon: 'Gear',
      navigator: {},
      document: { route: '/job/$id' },
      commands: [
        {
          name: 'cancel',
          title: 'Cancel a job',
          args: [{ name: 'id', type: 'string', required: true }],
        },
      ],
      promptHandler: false,
      entry: { url: '/plugin-registry/jobs/remoteEntry.js', module: './plugin' },
    });
    expect(result.success).toBe(true);
  });
});
