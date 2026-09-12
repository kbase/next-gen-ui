import { act } from 'react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromReact } from '../../plugins/sdk';
import type { Mount, PanelHandle, PluginHost } from '../../plugins/sdk';
import { useServices } from '../react/context';
import type { WorkbenchServices } from '../host/services';
import { hostReact } from './hostPlugins';

// A panel's own React root has no boundary above it in the host's tree, so
// what these assert is that the SDK's fence is in every root the host mounts.

const host = {} as PluginHost;

// Enough handle to mount against: the listener set is what a redraw runs on.
function stubPanel() {
  const listeners = new Set<() => void>();
  const panel: PanelHandle = {
    id: 'panel-1',
    plugin: 'home',
    kind: 'route',
    path: '/',
    focused: true,
    navigate: () => {},
    setTitle: () => {},
    setCrumbs: () => {},
    setTerms: () => {},
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { panel, redraw: () => listeners.forEach((l) => l()) };
}

const mounted: HTMLElement[] = [];

async function mount(module: { mount: Mount }, panel: PanelHandle) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  mounted.push(el);
  await act(async () => {
    module.mount(el, { panel, host });
  });
  return el;
}

afterEach(() => {
  mounted.splice(0).forEach((el) => el.remove());
  vi.restoreAllMocks();
});

function Boom(): never {
  throw new Error('the page threw while rendering');
}

describe('a page that throws while rendering', () => {
  // React reports a caught error through console.error; the assertion is the
  // rendered fence, not the log.
  const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {});

  // What threw is the fence alert's `trace`, which is collapsed until Details
  // is pressed.
  async function trace(el: HTMLElement) {
    await userEvent.setup().click(within(el).getByRole('button', { name: 'Details' }));
    return within(el).findByText('the page threw while rendering');
  }

  it('shows the fence from a host page', async () => {
    quiet();
    const { panel } = stubPanel();
    const el = await mount(hostReact(() => ({}) as WorkbenchServices, Boom), panel);
    expect(within(el).getByRole('alert')).toHaveTextContent('This panel crashed.');
    expect(await trace(el)).toBeInTheDocument();
  });

  it('shows the fence from a plugin page', async () => {
    quiet();
    const { panel } = stubPanel();
    const el = await mount(fromReact(Boom), panel);
    expect(within(el).getByRole('alert')).toHaveTextContent('This panel crashed.');
    expect(await trace(el)).toBeInTheDocument();
  });
});

describe('a host page', () => {
  it('reads the services the thunk answers with on the current draw', async () => {
    const services = [{ tag: 'first' }, { tag: 'second' }] as unknown as WorkbenchServices[];
    let draws = 0;
    const thunk = () => services[Math.min(draws, services.length - 1)];
    function Tag() {
      return <p>{(useServices() as unknown as { tag: string }).tag}</p>;
    }
    const { panel, redraw } = stubPanel();
    const el = await mount(hostReact(thunk, Tag), panel);
    expect(within(el).getByText('first')).toBeInTheDocument();

    draws = 1;
    await act(async () => redraw());
    expect(within(el).getByText('second')).toBeInTheDocument();
  });
});
