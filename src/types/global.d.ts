declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.css' {
  import type { CSSProperties } from 'react';
  export const className: string;
  export const style: CSSProperties;
}

interface ImportMetaEnv {
  readonly VITE_USE_LIVEKIT_AVATAR_VOICE: string;
  readonly VITE_USE_GROQ_STT: string;
  readonly VITE_USE_BROWSER_STT: string;
  readonly VITE_USE_GOOGLE_TTS: string;
  readonly VITE_USE_BROWSER_TTS: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
  readonly [key: string]: string | boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
