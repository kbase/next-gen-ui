import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Crumb, PanelHandle, Route } from '@kbase/plugin-sdk';
import { defineRoute } from '@kbase/plugin-sdk';
import type { Panel, PluginId } from '../../core';
import { noPersistence } from '../../host';
import { createWorkbench } from '../../compose';
import { localPlugin } from '../../host/local';
import { testWorkbench } from '../../../test/workbench';
import { PanelLayer } from '../PanelLayer';
import { Sidebar } from '../Sidebar';
import { WorkbenchProvider } from '../WorkbenchProvider';
import { PanelBoundary, PanelHost } from './PanelHost';

const body = defineRoute({
  normalize: (path) => path,
  mount: (el) => {
    el.textContent = 'flaky panel body';
  },
});

const panel: Panel = { id: 'p1', plugin: 'flaky', kind: 'route', path: '/' };

// `route` fails the given number of times before resolving, standing in for
// a remote whose entry is briefly unreachable.
function mountFlaky(failures: number) {
  let attempts = 0;
  const plugin = localPlugin({
    config: { id: 'flaky', title: 'Flaky' },
    route: (): Promise<Route> => {
      attempts += 1;
      return attempts <= failures
        ? Promise.reject(new Error('remote entry 503'))
        : Promise.resolve(body);
    },
  });
  const services = createWorkbench({
    installed: [plugin],
    persistence: noPersistence,
    // Neither module exists anywhere here, and naming a plugin that is not
    // installed is how a workbench is built without an assistant or an intent.
    defaultAssistant: 'none',
    defaultIntent: 'none',
  });
  render(
    <WorkbenchProvider services={services}>
      <PanelHost panel={panel} />
    </WorkbenchProvider>,
  );
  return () => attempts;
}

// The underlying error is the alert's `trace`, which is collapsed until
// Details is pressed. Returns the alert with the trace open in it.
async function withTrace(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Details' }));
  return screen.findByRole('alert');
}

describe('a panel whose module fails to load', () => {
  it('re-imports when Try again is pressed, and mounts what arrives', async () => {
    const user = userEvent.setup();
    const attempts = mountFlaky(1);

    const message = await screen.findByRole('alert');
    expect(message).toHaveTextContent('Flaky could not be loaded.');
    expect(await withTrace(user)).toHaveTextContent('remote entry 503');
    expect(attempts()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('flaky panel body')).toBeInTheDocument();
    expect(attempts()).toBe(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // The two failures read differently: this one names the plugin and is
  // retried by fetching, while a component that throws is the boundary's.
  it('says the module did not load, not that the panel crashed', async () => {
    mountFlaky(Infinity);
    expect(await screen.findByRole('alert')).not.toHaveTextContent('This panel crashed');
  });

  it('shows the failure again when the retry also fails', async () => {
    const user = userEvent.setup();
    const attempts = mountFlaky(2);

    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await withTrace(user)).toHaveTextContent('remote entry 503');
    expect(attempts()).toBe(2);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('flaky panel body')).toBeInTheDocument();
    expect(attempts()).toBe(3);
  });
});

// A pinned plugin's block, with the layer that draws the pane its slot
// measures out: a sidebar ghost is reachable only through a block, and the
// block is what holds it open.
function mountPinned(plugin: PluginId) {
  const services = testWorkbench({ defaultPinned: [plugin] });
  render(
    <WorkbenchProvider services={services}>
      <PanelLayer>
        <Sidebar />
      </PanelLayer>
    </WorkbenchProvider>,
  );
  return services;
}

describe('a pinned plugin with no pane to draw', () => {
  // `settings` is a host plugin: installed, a page and no pane. Pinning it is
  // the same state a plugin reaches when a new manifest drops its `pane`.
  it('says the installed plugin has no pane, and unpins from the block', async () => {
    const user = userEvent.setup();
    const services = mountPinned('settings');
    const body = await screen.findByRole('region', { name: 'Settings' });
    expect(body).toHaveTextContent('Settings has no sidebar pane');
    expect(body).toHaveTextContent('Settings is installed and has no sidebar pane to draw.');
    const run = vi.spyOn(services.registry, 'run');

    await user.click(within(body).getByRole('button', { name: 'Unpin' }));

    expect(run).toHaveBeenCalledWith('workbench:unpin', { plugin: 'settings' }, 'user');
    await waitFor(() => expect(services.store.get().sidebar.pinned).toEqual([]));
    expect(services.store.get().panels).toEqual({});
  });

  // The other nothing-here, and the one that may end: nothing unpins it, so
  // the plugin returning finds its block where it left it.
  it('says an uninstalled plugin is not installed, and keeps its block for it', async () => {
    const services = mountPinned('gone');
    const body = await screen.findByRole('region', { name: 'gone' });

    expect(body).toHaveTextContent('gone is not installed');
    expect(body).toHaveTextContent('This block is held for it, so reinstalling brings');
    expect(body).not.toHaveTextContent('has no sidebar pane');
    expect(within(body).getByRole('button', { name: 'Unpin' })).toBeInTheDocument();
    expect(services.store.get().sidebar.pinned).toEqual(['gone']);
  });
});

describe('a panel whose code throws while rendering', () => {
  it('fences the throw, says what threw, and draws again when restarted', async () => {
    const user = userEvent.setup();
    // React reports a caught error through console.error; the assertion is
    // the rendered fence, not the log.
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    let throws = true;
    function Body() {
      if (throws) throw new Error('the panel threw while rendering');
      return <p>panel body</p>;
    }
    render(
      <PanelBoundary>
        <Body />
      </PanelBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('This panel crashed.');
    expect(await withTrace(user)).toHaveTextContent('the panel threw while rendering');

    throws = false;
    await user.click(screen.getByRole('button', { name: 'Restart panel' }));
    expect(await screen.findByText('panel body')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    logged.mockRestore();
  });
});


// The panel handle takes four values from the plugin — its path, its title,
// its trail, its terms — and each is read by something else: the tab strip,
// the breadcrumb row, the question every other plugin is asked. A panel whose
// body is a framed app builds all four where TypeScript cannot see them, so
// each is checked where the plugin hands it over and refused to that call.
describe('a value the panel handle takes', () => {
  function handleFor(onMount: (panel: PanelHandle) => void) {
    const plugin = localPlugin({
      config: { id: 'flaky', title: 'Flaky' },
      route: (): Promise<Route> =>
        Promise.resolve(
          defineRoute({
            normalize: (path) => path,
            mount: (el, { panel: handle }) => {
              el.textContent = 'body';
              onMount(handle);
            },
          }),
        ),
    });
    const services = createWorkbench({
      installed: [plugin],
      persistence: noPersistence,
      defaultAssistant: 'none',
      defaultIntent: 'none',
    });
    render(
      <WorkbenchProvider services={services}>
        <PanelHost panel={panel} />
      </WorkbenchProvider>,
    );
    return services;
  }

  it('is refused, naming the call and the field, and the store keeps what it had', async () => {
    let handle: PanelHandle | undefined;
    const services = handleFor((h) => {
      handle = h;
    });
    await screen.findByText('body');

    expect(() => handle!.setCrumbs([{ label: 7 }] as unknown as Crumb[])).toThrow(
      /plugin flaky: setCrumbs refused the trail — 0\.label/,
    );
    expect(() => handle!.setTerms('uniprot:P0AEX9' as unknown as string[])).toThrow(
      /plugin flaky: setTerms refused the terms/,
    );
    expect(() => handle!.setTitle(undefined as unknown as string)).toThrow(
      /plugin flaky: setTitle refused the title/,
    );
    expect(() => handle!.navigate(null as unknown as string)).toThrow(
      /plugin flaky: navigate refused the path/,
    );

    expect(services.crumbs.get('p1')).toEqual([]);
    expect(services.terms.get('p1')).toEqual([]);
    expect(services.titles.get('p1')).toBeUndefined();
    expect(services.store.get().panels['p1']?.path ?? '/').toBe('/');
  });
});
