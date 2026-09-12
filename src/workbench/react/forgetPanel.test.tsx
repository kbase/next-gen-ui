import { act, configure, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defineRoute } from '../../plugins/sdk';
import { makeRoute } from '../core';
import { createWorkbench, noPersistence } from '../host';
import { localPlugin } from '../host/local';
import type { WorkbenchServices } from './services';
import { WorkbenchProvider } from './WorkbenchProvider';
import { Workbench } from './Workbench';

configure({ asyncUtilTimeout: 5000 });

// A plugin whose pages push all three of the things the host holds beside the
// layout under a panel id.
function mount(): WorkbenchServices {
  const plugin = localPlugin({
    config: { id: 'pusher', title: 'Pusher' },
    route: () =>
      Promise.resolve(
        defineRoute({
          normalize: (path) => path,
          mount: (el, { panel }) => {
            panel.setTitle(`Title of ${panel.id}`);
            panel.setCrumbs([{ label: 'Proteins', path: '/proteins' }]);
            panel.setTerms(['uniprot:P0AEX9']);
            el.textContent = `body ${panel.id}`;
          },
        }),
      ),
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
      <Workbench />
    </WorkbenchProvider>,
  );
  return services;
}

const held = ({ titles, crumbs, terms }: WorkbenchServices, id: string) => ({
  title: titles.get(id),
  trail: crumbs.get(id),
  terms: terms.get(id),
});

describe('what the host holds under a panel id', () => {
  it('is gone, all of it, once the panel closes', async () => {
    const services = mount();
    const page = makeRoute('pusher', '/protein/P0AEX9', 'a');
    act(() => void services.dispatch({ type: 'open', panel: page }));
    await screen.findByText(`body ${page.id}`);
    expect(held(services, page.id)).toEqual({
      title: `Title of ${page.id}`,
      trail: [{ label: 'Proteins', path: '/proteins' }],
      terms: ['uniprot:P0AEX9'],
    });

    act(() => void services.dispatch({ type: 'close', panel: page.id }));
    await waitFor(() => expect(screen.queryByText(`body ${page.id}`)).not.toBeInTheDocument());
    expect(held(services, page.id)).toEqual({ title: undefined, trail: [], terms: [] });
  });

  // The panel behind a tab is still open: its body stays mounted and nothing
  // it pushed is dropped, or bringing it forward would show the placeholder
  // title until its next render.
  it('survives the panel being covered by another tab', async () => {
    const services = mount();
    const first = makeRoute('pusher', '/protein/P0AEX9', 'a');
    const second = makeRoute('pusher', '/protein/P0A6F5', 'b');
    act(() => void services.dispatch({ type: 'open', panel: first }));
    await screen.findByText(`body ${first.id}`);
    act(() => void services.dispatch({ type: 'open', panel: second }));
    await screen.findByText(`body ${second.id}`);
    expect(services.store.get().focus).toBe(second.id);

    expect(held(services, first.id)).toEqual({
      title: `Title of ${first.id}`,
      trail: [{ label: 'Proteins', path: '/proteins' }],
      terms: ['uniprot:P0AEX9'],
    });
  });
});
