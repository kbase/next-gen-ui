// Guards the shared-React fix: host.ts must load via the MF runtime globals
// (registerRemotes/loadRemote), not a fresh createInstance. If it regresses,
// these mocked globals go uncalled and the test fails. Also covers the version gate.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@module-federation/runtime', () => ({
  registerRemotes: vi.fn(),
  loadRemote: vi.fn(),
}));

import { loadRemote, registerRemotes } from '@module-federation/runtime';
import { CONTRACT_VERSION } from './sdk';
import { loadPlugin, registerPlugin } from './host';

const Component = () => null;

beforeEach(() => {
  vi.mocked(registerRemotes).mockClear();
  vi.mocked(loadRemote).mockReset();
});

describe('plugin host', () => {
  it('registers a remote via the shared runtime', () => {
    registerPlugin({ id: 'alpha', manifestUrl: 'https://reg/assets/alpha/mf-manifest.json' });
    expect(registerRemotes).toHaveBeenCalledWith(
      [{ name: 'alpha', entry: 'https://reg/assets/alpha/mf-manifest.json' }],
      expect.anything(),
    );
  });

  it('loads a plugin through loadRemote and returns it', async () => {
    vi.mocked(loadRemote).mockResolvedValue({
      default: { contractVersion: CONTRACT_VERSION, Component },
    });
    const plugin = await loadPlugin('alpha');
    expect(loadRemote).toHaveBeenCalledWith('alpha/Plugin');
    expect(plugin.Component).toBe(Component);
  });

  it('rejects a module with no Component', async () => {
    vi.mocked(loadRemote).mockResolvedValue({ default: { contractVersion: CONTRACT_VERSION } });
    await expect(loadPlugin('alpha')).rejects.toThrow(/no valid/i);
  });

  it('rejects a plugin built for a different contract version', async () => {
    vi.mocked(loadRemote).mockResolvedValue({ default: { contractVersion: '999', Component } });
    await expect(loadPlugin('alpha')).rejects.toThrow(/contract/i);
  });
});
