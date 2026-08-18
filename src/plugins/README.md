# plugins

Runtime plugin host. The app loads plugin UIs as [Module
Federation](https://module-federation.io) remotes listed by a registry —
no rebuild, no per-plugin server.

- `registry.ts` — `pluginsOptions()`: the plugins the registry lists
  (`GET {VITE_PLUGIN_REGISTRY_URL}/plugins`), Zod-validated.
- `host.ts` — loads plugins through the app's Module Federation host (the
  one the vite `federation()` plugin initializes, which holds the shared
  scope, so a plugin reuses the app's React): `registerPlugin` and
  `loadPlugin` (which also rejects a plugin whose contract version differs).
- `sdk/` — the plugin authoring surface and the single source of truth for
  the shared contract, consumed by the host and every plugin:
  - `SHARED_SINGLETONS` — the MF singletons; imported by the app's
    `vite.config` and by each plugin's, so their versions can't drift apart.
  - `PluginProps` / `Plugin` types; `CONTRACT_VERSION` — the mount-contract
    version the host checks before mounting.
  - `definePlugin(routeTree)` — the whole plugin runtime: mounts a plugin's
    own router over the host's shared history.
  - `pluginFederation({ name })` — a plugin's vite preset.
  - (to be published as `@kbase/plugin-ui-sdk` — follow-up).
- `src/routes/$pluginId.$.tsx` — plugins mount at the top level (`/{id}`
  and below). Static routes match first, so a plugin claims only an id no
  real route uses. A **future** top-level app route could shadow an
  existing plugin id, so the registry enforces a reserved-id denylist.
  Unknown ids render a not-found page; a registry/load failure renders a
  Retry. The loader registers and loads the remote before render.

The host hands each plugin the app's TanStack Router (whole API) plus its
`basepath` (`/{id}`). The plugin runs its own basepath-scoped router over
the app's shared history, so it routes in clean local paths
(`<Link to="/detail">` → `/{id}/detail`) with native back/forward.

Plugin assets load same-origin: nginx reverse-proxies the registry under
`/plugin-registry/` (see `nginx.conf`), so the CSP keeps `script-src 'self'`.
The registry endpoint is stubbed via MSW in dev/test. `@kbase/design-system`
sharing and publishing the SDK are follow-ups.
