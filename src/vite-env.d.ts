/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  /** Set "true" to use Firestore long-polling (proxies); default WebChannel avoids some SDK watch bugs in dev. */
  readonly VITE_FIRESTORE_USE_LONG_POLLING?: string;
  /** Unsafe: allow SendGrid/Mailgun from browser (usually blocked by CORS). */
  readonly VITE_ALLOW_BROWSER_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
