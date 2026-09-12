import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Route } from '../../plugins/sdk';
import { defineRoute } from '../../plugins/sdk';
import type { Panel } from '../core';
import { noPersistence } from '../host';
import { createWorkbench } from '../compose';
import { localPlugin } from '../host/local';
import { WorkbenchProvider } from './WorkbenchProvider';
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
