import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { HostContext, PanelContext, definePluginManifest } from '../../plugins/sdk';
import type { Mount, Pane, Route } from '../../plugins/sdk';
import { ServicesContext } from '../react/context';
import type { WorkbenchServices } from '../react/services';
import type { InstalledPlugin } from './installed';
import { localPlugin } from './local';

// The host's own pages and blocks, installed over the same index as every
// plugin so they pin, fold, drag, complete and link like one. They reach
// the host's services directly, which no plugin over the SDK can, so their
// React trees carry the services context as well as the SDK's two.
//
// `services` is a thunk: these are built before the services object exists
// and the loaders run long after.

export function hostPlugins(services: () => WorkbenchServices): InstalledPlugin[] {
  const page = (load: () => Promise<ComponentType>) => async (): Promise<Route> => ({
    ...hostReact(services, await load()),
    // One page each; every path is the same page.
    normalize: () => '/',
  });
  const block =
    (load: () => Promise<ComponentType>, fit?: 'content') => async (): Promise<Pane> => ({
      ...hostReact(services, await load()),
      fit,
    });

  return [
    localPlugin({
      // The plugin id stays `catalog`: it is in saved layouts and in the URL
      // of any panel a user has open. The title, icon and command label are
      // what a reader sees, and those say Settings.
      config: definePluginManifest({
        id: 'catalog',
        title: 'Settings',
        description:
          'Installed plugins, what is pinned, the assistant and the suggestions setting.',
        icon: 'Gear',
        commands: [{ name: 'catalog', title: 'Open settings', icon: 'Gear' }],
        shortcuts: [{ label: 'Settings', command: 'catalog' }],
      }),
      route: page(() => import('./catalog/Catalog').then((m) => m.CatalogDocument)),
      commands: () => import('./catalog/commands').then((m) => m.commands),
    }),
    localPlugin({
      config: definePluginManifest({
        id: 'docs',
        title: 'Plugin developer documentation',
        description: 'The manifest, the six modules, and the handles a panel runs against.',
        icon: 'Code',
        commands: [
          { name: 'plugin-docs', title: 'Open the plugin developer documentation', icon: 'Code' },
        ],
      }),
      route: page(() => import('./docs/Docs').then((m) => m.DocsDocument)),
      commands: () => import('./docs/commands').then((m) => m.commands),
    }),
    localPlugin({
      config: definePluginManifest({
        id: 'shortcuts',
        title: 'Shortcuts',
        description: "Every installed plugin's shortcut commands, as buttons.",
        icon: 'Lightning',
      }),
      pane: block(
        () => import('./shortcuts/Shortcuts').then((m) => m.ShortcutsNavigator),
        'content',
      ),
    }),
    localPlugin({
      // Deliberately not `fit: 'content'`: this list is as long as the
      // answers are, and a block at natural height would take that length
      // out of the blocks under it. It takes a share of the stack and scrolls.
      config: definePluginManifest({
        id: 'related',
        title: 'Related',
        description: 'What other plugins have about the open panel and the cart.',
        icon: 'LinkSimple',
        color: 'blue',
      }),
      pane: block(() => import('./related/RelatedNavigator').then((m) => m.RelatedNavigator)),
    }),
    localPlugin({
      // A page, not a block: the launcher is reached like any other page
      // rather than as a piece of chrome.
      config: definePluginManifest({
        id: 'home',
        title: 'Home',
        description: 'Everything installed: apps to open, panels to show.',
        icon: 'House',
        commands: [
          {
            name: 'browse',
            title: 'Browse everything installed',
            icon: 'House',
            semantics: {
              description:
                'Browse, list, search or show everything installed: every app, page, panel, tool and plugin.',
              examples: ['browse', 'show me everything', 'what is installed', 'list the apps'],
            },
          },
        ],
        shortcuts: [{ label: 'Browse', command: 'browse' }],
      }),
      route: page(() => import('./home/Home').then((m) => m.HomeDocument)),
      commands: () => import('./home/commands').then((m) => m.commands),
    }),
  ];
}

// `fromReact` with the host's services in the tree.
function hostReact(services: () => WorkbenchServices, Component: ComponentType): { mount: Mount } {
  return {
    mount(el, { panel, host }) {
      const root = createRoot(el);
      const draw = () =>
        root.render(
          <ServicesContext value={services()}>
            <PanelContext value={{ ...panel, path: panel.path, focused: panel.focused }}>
              <HostContext value={host}>
                <Component />
              </HostContext>
            </PanelContext>
          </ServicesContext>,
        );
      draw();
      const stop = panel.subscribe(draw);
      return () => {
        stop();
        // The host tears panels down from its own commit phase, and a root
        // cannot be unmounted while another is mid-render; the next tick is
        // after that commit.
        setTimeout(() => root.unmount(), 0);
      };
    },
  };
}
