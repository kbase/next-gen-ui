/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_ORIGIN?: string;
  readonly VITE_DEV_AUTH_PROXY?: string;
  readonly VITE_COOKIE_DOMAIN?: string;
  readonly VITE_DEV_ALLOWED_HOSTS?: string;
  readonly VITE_PLUGIN_REGISTRY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
