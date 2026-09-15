import { StrictMode } from 'react';
import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { definePane, defineRoute } from '@kbase/plugin-sdk';
import type { GroupId, PanelId } from '../../core';
import { groups, makeRoute, paneId } from '../../core';
import { noPersistence } from '../../host';
import { createWorkbench } from '../../compose';
import { localPlugin } from '../../host/local';
import { panelDomId, tabDomId } from '../domIds';
import { WorkbenchProvider } from '../WorkbenchProvider';
import { Workbench } from '../Workbench';

configure({ asyncUtilTimeout: 5000 });

// Counts what the host asked of the plugin: one `mount` per panel for as
// long as the panel lives, whatever the layout does to it. A body that was
// unmounted and mounted again would have lost whatever it held — a scroll
// position, a half-filled form, an iframe's document.
function countingPlugin() {
  const mounts = new Map<PanelId, number>();
  const body = (label: string) => ({
    mount: (el: HTMLElement, { panel }: { panel: { id: PanelId } }) => {
      mounts.set(panel.id, (mounts.get(panel.id) ?? 0) + 1);
      el.textContent = `${label} ${panel.id}`;
    },
  });
  return {
    mounts,
    plugin: localPlugin({
      config: { id: 'counter', title: 'Counter' },
      route: () => Promise.resolve(defineRoute({ ...body('page'), normalize: (p) => p })),
      pane: () => Promise.resolve(definePane(body('pane'))),
    }),
  };
}

function mount() {
  const { mounts, plugin } = countingPlugin();
  const services = createWorkbench({
    installed: [plugin],
    persistence: noPersistence,
    defaultPinned: ['counter'],
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
  return { services, mounts };
}

const mainGroups = (services: ReturnType<typeof mount>['services']): GroupId[] =>
  groups(services.store.get().main).map((g) => g.id);

describe('a panel that is moved', () => {
  it('keeps its mount across a tab move, a split and a sidebar↔main move', async () => {
    const { services, mounts } = mount();
    const pane = paneId('counter');
    const first = makeRoute('counter', '/one', 'a');
    const second = makeRoute('counter', '/two', 'b');
    act(() => {
      services.dispatch({ type: 'open', panel: first });
      services.dispatch({ type: 'open', panel: second });
    });
    await screen.findByText(`page ${first.id}`);
    await screen.findByText(`page ${second.id}`);
    await waitFor(() => expect(mounts.get(pane)).toBe(1));

    // A split: the second tab leaves the root group for a new one beside it,
    // and the root group gains a parent it did not have.
    const [root] = mainGroups(services);
    act(() => {
      services.dispatch({ type: 'move', panel: second.id, to: { group: root, side: 'right' } });
    });
    await waitFor(() => expect(mainGroups(services)).toHaveLength(2));

    // A tab move: back into the group it came from, which under the split is
    // a different parent again.
    act(() => {
      services.dispatch({ type: 'move', panel: second.id, to: { group: root, index: 1 } });
    });
    await waitFor(() => expect(mainGroups(services)).toHaveLength(1));

    // Out of the sidebar into the main area and back: the widest move of the
    // three, between two parts of the shell drawn by different components.
    act(() => {
      services.dispatch({ type: 'move', panel: pane, to: { group: root } });
    });
    await waitFor(() => expect(services.store.get().sidebar.pinned).toContain('counter'));
    await screen.findByRole('tab', { name: 'Counter' });
    act(() => {
      services.dispatch({ type: 'move', panel: pane, to: { zone: 'sidebar' } });
    });
    await waitFor(() => expect(screen.queryByRole('tab', { name: 'Counter' })).toBeNull());

    expect(Object.fromEntries(mounts)).toEqual({
      [first.id]: 1,
      [second.id]: 1,
      [pane]: 1,
    });
  });

  // The first panel opened, moved after a second: its claim is now the
  // newest, and a layer that listed panels in claim order would reorder its
  // keyed children. React moves a reordered child, and StrictMode re-runs
  // the effects of a child React moved — the development server's build,
  // where that would run `mount` again on every split.
  it('keeps its mount when it is the first opened and moved last, under StrictMode', async () => {
    const { mounts, plugin } = countingPlugin();
    const services = createWorkbench({
      installed: [plugin],
      persistence: noPersistence,
      defaultAssistant: 'none',
      defaultIntent: 'none',
    });
    render(
      <StrictMode>
        <WorkbenchProvider services={services}>
          <Workbench />
        </WorkbenchProvider>
      </StrictMode>,
    );
    const first = makeRoute('counter', '/one', 'a');
    const second = makeRoute('counter', '/two', 'b');
    act(() => {
      services.dispatch({ type: 'open', panel: first });
      services.dispatch({ type: 'open', panel: second });
    });
    await screen.findByText(`page ${first.id}`);
    await screen.findByText(`page ${second.id}`);
    // StrictMode mounts twice on purpose; what is counted is what a move adds.
    const settled = mounts.get(first.id)!;
    const [root] = mainGroups(services);
    act(() => {
      services.dispatch({ type: 'move', panel: first.id, to: { group: root, side: 'right' } });
    });
    await waitFor(() => expect(mainGroups(services)).toHaveLength(2));
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(mounts.get(first.id)).toBe(settled);
  });

  // The counter above asserts an absence, so this asserts it can be present:
  // folding a block does take the pane's slot away, the panel is unmounted,
  // and unfolding runs `mount` a second time.
  it('is mounted again when its slot goes away, which folding a block does', async () => {
    const { services, mounts } = mount();
    const pane = paneId('counter');
    await waitFor(() => expect(mounts.get(pane)).toBe(1));
    act(() => {
      services.dispatch({ type: 'fold', panel: pane, folded: true });
    });
    await waitFor(() => expect(screen.queryByText(`pane ${pane}`)).toBeNull());
    act(() => {
      services.dispatch({ type: 'fold', panel: pane, folded: false });
    });
    await waitFor(() => expect(mounts.get(pane)).toBe(2));
  });

  it('draws one body for a pane the sidebar and a flyout both name', async () => {
    const { services, mounts } = mount();
    const pane = paneId('counter');
    await waitFor(() => expect(mounts.get(pane)).toBe(1));
    act(() => {
      services.dispatch({ type: 'sidebar', collapsed: true });
    });
    // The block's slot is hidden while the rail is showing, and the pane is
    // drawn in the flyout its icon opens; there is one body either way.
    await waitFor(() => expect(screen.getAllByText(`pane ${pane}`)).toHaveLength(1));
    expect(mounts.get(pane)).toBe(1);
  });
});

// The contents are a React child of the layer and a DOM child of the slot,
// and React delivers events along the React tree; a handler that sat on the
// slot saw nothing from inside the contents, and the focus stayed where it
// was when a reader clicked into a pane or a page.
describe('a pointer or a focus inside a panel', () => {
  it('makes it the focused panel, in a tab and in a sidebar block', async () => {
    const { services } = mount();
    const pane = paneId('counter');
    const first = makeRoute('counter', '/one', 'a');
    const second = makeRoute('counter', '/two', 'b');
    act(() => {
      services.dispatch({ type: 'open', panel: first });
      services.dispatch({ type: 'open', panel: second });
    });
    const inFirst = await screen.findByText(`page ${first.id}`);
    const inPane = await screen.findByText(`pane ${pane}`);
    expect(services.store.get().focus).toBe(second.id);

    fireEvent.pointerDown(inFirst);
    expect(services.store.get().focus).toBe(first.id);

    fireEvent.pointerDown(inPane);
    expect(services.store.get().focus).toBe(pane);

    fireEvent.focusIn(inFirst);
    expect(services.store.get().focus).toBe(first.id);
  });
});

describe('a panel and the tab that names it', () => {
  it('are wired to each other, and the panel is inside the box the tab names', async () => {
    const { services } = mount();
    const first = makeRoute('counter', '/one', 'a');
    const second = makeRoute('counter', '/two', 'b');
    act(() => {
      services.dispatch({ type: 'open', panel: first });
      services.dispatch({ type: 'open', panel: second });
    });

    const body = await screen.findByRole('tabpanel');
    const tab = document.getElementById(tabDomId(second.id))!;
    expect(tab).toHaveAttribute('role', 'tab');
    expect(tab).toHaveAttribute('aria-controls', body.id);
    expect(body).toHaveAttribute('aria-labelledby', tab.id);
    expect(body.id).toBe(panelDomId(second.id));
    expect(within(body).getByText(`page ${second.id}`)).toBeInTheDocument();

    // The background tab's panel is still mounted and still where it was,
    // hidden rather than taken away, so coming back to it costs nothing.
    const background = document.getElementById(panelDomId(first.id))!;
    expect(within(background).getByText(`page ${first.id}`)).toBeInTheDocument();
    expect(background).not.toBeVisible();
    expect(body).toBeVisible();
    act(() => {
      services.dispatch({ type: 'focus', panel: first.id });
    });
    await waitFor(() => expect(background).toBeVisible());
    expect(body).not.toBeVisible();
  });
});
