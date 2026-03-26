import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/** Default project (marketflow-cf7f1). Override with VITE_FIREBASE_* in `.env`. */
const embeddedConfig: FirebaseOptions = {
  apiKey: "AIzaSyAk7tg62sbb0NgbrHRT1ONpFP9Y6GRozdE",
  authDomain: "marketflow-cf7f1.firebaseapp.com",
  projectId: "marketflow-cf7f1",
  storageBucket: "marketflow-cf7f1.firebasestorage.app",
  messagingSenderId: "77892839271",
  appId: "1:77892839271:web:9528eec9d27b196a8871c2",
  measurementId: "G-XVRWX6VBEK",
};

function envOr(key: keyof ImportMetaEnv, fallback: string): string {
  const v = import.meta.env[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: envOr("VITE_FIREBASE_API_KEY", embeddedConfig.apiKey as string),
  authDomain: envOr("VITE_FIREBASE_AUTH_DOMAIN", embeddedConfig.authDomain as string),
  projectId: envOr("VITE_FIREBASE_PROJECT_ID", embeddedConfig.projectId as string),
  storageBucket: envOr("VITE_FIREBASE_STORAGE_BUCKET", embeddedConfig.storageBucket as string),
  messagingSenderId: envOr(
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    embeddedConfig.messagingSenderId as string
  ),
  appId: envOr("VITE_FIREBASE_APP_ID", embeddedConfig.appId as string),
};

const measurementId = envOr(
  "VITE_FIREBASE_MEASUREMENT_ID",
  (embeddedConfig.measurementId as string) || ""
);
if (measurementId) {
  firebaseConfig.measurementId = measurementId;
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Firebase is not configured. Copy .env.example to .env and set VITE_FIREBASE_* variables, " +
      "or keep the embedded defaults in src/lib/firebase.ts for this project."
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Long-polling fallback helps when WebChannel traffic is blocked (VPNs/proxies). HMR may init twice — fall back to getFirestore.
function createDb() {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = createDb();

let storage;
try {
  storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
} catch (error) {
  console.warn("Failed to initialize storage with explicit bucket, trying default:", error);
  storage = getStorage(app);
}

export { storage };
