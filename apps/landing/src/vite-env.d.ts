/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the signed Android APK is served from. Overrides the default. */
  readonly VITE_APK_URL?: string;
  /** Origin of the installable iOS web app. */
  readonly VITE_IOS_APP_URL?: string;
  /** Origin of the mentor portal, for the one footer link that points at it. */
  readonly VITE_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
