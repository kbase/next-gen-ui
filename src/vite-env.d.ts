/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_ORIGIN?: string;
  readonly VITE_DEV_AUTH_PROXY?: string;
  readonly VITE_COOKIE_DOMAIN?: string;
  readonly VITE_AUTH_ENVIRONMENT?: string;
  readonly VITE_DEV_ALLOWED_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
