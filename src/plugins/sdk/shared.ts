import { dependencies, version } from '../../../package.json';

// Dependencies that must resolve to one instance across host and plugins: a
// second React breaks hooks and context; a second zod breaks instanceof.
// Ranges come from package.json so they cannot drift from what is installed.
// Build-time only (vite.config and the pluginFederation preset).
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
  // Built from this repo and aliased to source in the host, so it is not in
  // `dependencies`; host and plugins agree on the repo version.
  '@kbase/design-system': { singleton: true, requiredVersion: version },
  '@kbase/plugin-sdk': { singleton: true, requiredVersion: version },
};
