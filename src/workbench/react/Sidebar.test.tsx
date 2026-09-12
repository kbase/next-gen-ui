import { act, configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import tokens from '@kbase/design-system/tokens.css?raw';
import { definePane } from '../../plugins/sdk';
import type { PanelId, PluginId } from '../core';
import { paneId } from '../core';
import { createWorkbench, noPersistence } from '../host';
import { localPlugin } from '../host/local';
import { testWorkbench } from '../../test/workbench';
import { panelDomId } from './domIds';
import { PanelLayer } from './PanelLayer';
import { Sidebar } from './Sidebar';
import { WorkbenchProvider } from './WorkbenchProvider';

configure({ asyncUtilTimeout: 5000 });

// Every item a block's menu offers, and the command it runs. What names the
// block differs by command: folding and unfolding act on the panel, pinning
// on the plugin, and a reorder adds the position it is moving to. KOROS is
// pinned between two others here so both directions are offered. The menu is
// listed against this table below, so an item added without a command fails
// here rather than passing unnoticed.
const ACTIONS: Array<[item: string, command: string, args: object]> = [
  ['Fold', 'workbench:fold', { panel: paneId('koros') }],
  ['Move to main area', 'workbench:move-to-main-area', { panel: paneId('koros') }],
  ['Move up', 'workbench:pin', { plugin: 'koros', index: '0' }],
  ['Move down', 'workbench:pin', { plugin: 'koros', index: '2' }],
  ['Unpin', 'workbench:unpin', { plugin: 'koros' }],
];

function mount(pinned: PluginId[]) {
  const services = testWorkbench({ defaultPinned: pinned });
  render(
    <WorkbenchProvider services={services}>
      <Sidebar />
    </WorkbenchProvider>,
  );
  return services;
}

type User = ReturnType<typeof userEvent.setup>;

async function openBlockMenu(user: User, title: string) {
  await user.pointer({
    target: await screen.findByRole('button', { name: title }),
    keys: '[MouseRight]',
  });
}

// Spied once the menu is open, so what the assertions see is the item's own
// effect and not the clicks that got there.
function watch(services: ReturnType<typeof mount>) {
  return {
    run: vi.spyOn(services.registry, 'run').mockResolvedValue(undefined),
    dispatch: vi.spyOn(services.store, 'dispatch'),
  };
}

describe("a sidebar block's menu", () => {
  it.each(ACTIONS)('%s runs %s', async (item, command, args) => {
    const user = userEvent.setup();
    const services = mount(['jobs', 'koros', 'data']);
    await openBlockMenu(user, 'KOROS');
    const { run, dispatch } = watch(services);

    await user.click(await screen.findByRole('menuitem', { name: item }));

    expect(run).toHaveBeenCalledWith(command, args, 'user');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('offers nothing the table above does not list', async () => {
    const user = userEvent.setup();
    mount(['jobs', 'koros', 'data']);
    await openBlockMenu(user, 'KOROS');
    const menu = await screen.findByRole('menu');
    const items = [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
    expect(items.map((el) => el.textContent?.trim())).toEqual(ACTIONS.map(([item]) => item));
  });
});

describe("a preview block's Pin button", () => {
  it('runs pin for the plugin being previewed', async () => {
    const user = userEvent.setup();
    const services = mount(['jobs', 'koros']);
    await user.click(screen.getByRole('button', { name: /^More plugins \(\d+\)$/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Data' }));
    const preview = await screen.findByRole('region', { name: 'Data preview' });
    const { run, dispatch } = watch(services);

    await user.click(within(preview).getByRole('button', { name: 'Pin' }));

    expect(run).toHaveBeenCalledWith('workbench:pin', { plugin: 'data' }, 'user');
    expect(dispatch).not.toHaveBeenCalled();
  });
});

// jsdom computes no layout and paints nothing, so the stacking test below
// reads the declaration each element ended up with and resolves it here. Both
// declarations name --z-anchored, which is what makes them comparable at all:
// an overlay and the pane drawn over it are one step apart on one scale.
const ANCHORED = Number(/--z-anchored:\s*(\d+)/.exec(tokens)![1]);

function tier(declared: string): number {
  const found = /^(?:calc\()?var\(--z-anchored\)(?:\s*\+\s*(\d+)\))?$/.exec(declared);
  if (!found) throw new Error(`z-index "${declared}" is not a step off --z-anchored`);
  return ANCHORED + Number(found[1] ?? 0);
}

// Whether an element starts a stacking context of its own, by the properties
// that do it and that jsdom reports.
function stackingContext(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  return (
    (s.position !== 'static' && s.zIndex !== 'auto') ||
    s.position === 'fixed' ||
    s.transform !== 'none' ||
    s.filter !== 'none' ||
    s.isolation === 'isolate' ||
    s.mixBlendMode !== 'normal' ||
    Number(s.opacity || '1') < 1 ||
    s.willChange !== 'auto' ||
    (s.contain !== 'none' && s.contain !== '')
  );
}

// A collapsed sidebar crops the blocks away, and a pinned pane is drawn in
// the flyout its rail icon opens. Counting the plugin's `mount` calls is what
// says the pane moved into the flyout rather than being drawn a second time:
// a second mount would have lost whatever the pane was holding.
function mountRail() {
  const mounts = new Map<PanelId, number>();
  const services = createWorkbench({
    installed: [
      localPlugin({
        config: { id: 'counter', title: 'Counter' },
        pane: () =>
          Promise.resolve(
            definePane({
              mount: (el: HTMLElement, { panel }: { panel: { id: PanelId } }) => {
                mounts.set(panel.id, (mounts.get(panel.id) ?? 0) + 1);
                el.textContent = `pane ${panel.id}`;
              },
            }),
          ),
      }),
    ],
    persistence: noPersistence,
    defaultPinned: ['counter'],
    defaultAssistant: 'none',
    defaultIntent: 'none',
  });
  render(
    <WorkbenchProvider services={services}>
      <PanelLayer>
        <Sidebar />
      </PanelLayer>
    </WorkbenchProvider>,
  );
  return { services, mounts };
}

// Collapses the sidebar and opens the flyout from the rail icon, which is
// the only way a reader reaches it. The icon and the block header carry the
// same name, so the query is confined to the rail.
async function openFlyout(user: User, services: ReturnType<typeof mountRail>['services']) {
  act(() => {
    services.dispatch({ type: 'sidebar', collapsed: true });
  });
  const rail = within(screen.getByRole('toolbar', { name: 'Pinned plugins' }));
  await user.click(rail.getByRole('button', { name: 'Counter' }));
  return screen.findByRole('dialog', { name: 'Counter' });
}

describe("a collapsed rail icon's flyout", () => {
  it('opens on the icon, holds the pane it names, and closes on Escape', async () => {
    const user = userEvent.setup();
    const { services, mounts } = mountRail();
    const pane = paneId('counter');
    await waitFor(() => expect(mounts.get(pane)).toBe(1));
    const flyout = await openFlyout(user, services);

    // The pane's body is drawn in the panel layer, over the flyout rather
    // than inside it, so `aria-owns` is the flyout's claim on it and the id
    // is the only way a query reaches it.
    expect(flyout).toHaveAttribute('aria-owns', panelDomId(pane));
    const body = document.getElementById(panelDomId(pane));
    expect(body).toHaveTextContent(`pane ${pane}`);
    expect(document.querySelectorAll(`[data-panel="${pane}"]`)).toHaveLength(1);
    expect(mounts.get(pane)).toBe(1);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Counter' })).toBeNull());
    // The flyout's slot went with it, and the pane keeps its mount in the
    // block's hidden one.
    expect(mounts.get(pane)).toBe(1);
  });

  it('is drawn under the pane it holds, which is a tier above the positioner', async () => {
    const user = userEvent.setup();
    const { services } = mountRail();
    const pane = paneId('counter');
    const flyout = await openFlyout(user, services);
    const positioner = flyout.parentElement!;
    const body = document.getElementById(panelDomId(pane))!;

    // The popover's own box declares no tier, so the positioner's is the one
    // the body has to clear.
    expect(getComputedStyle(flyout).zIndex).toBe('auto');
    expect(tier(getComputedStyle(body).zIndex)).toBeGreaterThan(
      tier(getComputedStyle(positioner).zIndex),
    );

    // A z-index only ranks siblings within one stacking context. The body is
    // drawn in the workbench's tree and the positioner in a portal, so the
    // two are compared only while every ancestor of the body up to the
    // document leaves the root context alone. `.panelLayer` generating no box
    // is what keeps that true.
    for (let el = body.parentElement; el; el = el.parentElement) {
      expect([el.className, stackingContext(el)]).toEqual([el.className, false]);
    }
  });
});
