import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAk7tg62sbb0NgbrHRT1ONpFP9Y6GRozdE",
  authDomain: "marketflow-cf7f1.firebaseapp.com",
  projectId: "marketflow-cf7f1",
  storageBucket: "marketflow-cf7f1.firebasestorage.app",
  messagingSenderId: "77892839271",
  appId: "1:77892839271:web:9528eec9d27b196a8871c2",
  measurementId: "G-XVRWX6VBEK"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize storage - try with explicit bucket URL first, fallback to default
// The 404 error usually means Storage isn't enabled in Firebase Console
let storage;
try {
  // Try with explicit bucket URL
  storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
} catch (error) {
  console.warn('Failed to initialize storage with explicit bucket, trying default:', error);
  // Fallback to default initialization
  storage = getStorage(app);
}

export { storage };
