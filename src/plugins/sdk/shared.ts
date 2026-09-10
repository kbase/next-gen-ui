import { dependencies, version } from '../../../package.json';

// Dependencies that resolve to one instance across host and plugins. Two
// kinds: react, react-dom, zod, the design system and this SDK because a
// second copy breaks something — hooks, the panel context, Tooltip's
// context, schema identity; Phosphor and the router because the host ships
// them already and a copy in a plugin is pure weight. Ranges come from
// package.json so they cannot drift from what is installed. Build-time
// only (vite.config and the pluginFederation preset).
const deps: Record<string, string> = dependencies;

function shared(name: string) {
  const requiredVersion = deps[name];
  if (!requiredVersion) {
    throw new Error(
      `SHARED_SINGLETONS names "${name}", which is not in package.json dependencies.`,
    );
  }
  return { singleton: true, requiredVersion };
}

export const SHARED_SINGLETONS = {
  react: shared('react'),
  'react-dom': shared('react-dom'),
  zod: shared('zod'),
  '@phosphor-icons/react': shared('@phosphor-icons/react'),
  '@tanstack/react-router': shared('@tanstack/react-router'),
  // Built from this repo and aliased to source in the host, so it is not in
  // `dependencies`; host and plugins agree on the repo version.
  '@kbase/design-system': { singleton: true, requiredVersion: version },
  '@kbase/plugin-sdk': { singleton: true, requiredVersion: version },
};
