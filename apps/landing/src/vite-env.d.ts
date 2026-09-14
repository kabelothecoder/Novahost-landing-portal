/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the signed Android APK is served from. Overrides the default. */
  readonly VITE_APK_URL?: string;
  /** Origin of the installable iOS web app. */
  readonly VITE_IOS_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
