import type { ComponentType } from 'react';
import type { AnyRouter } from '@tanstack/react-router';

// Version of the mount contract (the props below + how a plugin is mounted).
// The host refuses a plugin built against a different version. Router-library
// compatibility is separate — the shared-singleton pins in shared.ts handle it.
export const CONTRACT_VERSION = '1';

// What the host passes each plugin: the app router (app-level navigation) and
// the plugin's mount path, `/{id}`.
export interface PluginProps {
  router: AnyRouter;
  basepath: string;
}

/** A plugin's `./Plugin` module default-exports this. */
export interface Plugin {
  contractVersion: string;
  Component: ComponentType<PluginProps>;
}
