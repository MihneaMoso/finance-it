/**
 * Firebase init (Firestore)
 *
 * IMPORTANT:
 * - Uses EXPO_PUBLIC_* env vars (safe for client config).
 * - Firestore security must be enforced via Firestore Security Rules.
 *   TODO: add recommended rules to README / docs.
 */

import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function assertConfig() {
    const missing = Object.entries(firebaseConfig)
        .filter(([, v]) => !v)
        .map(([k]) => k);
    if (missing.length) {
        throw new Error(
            `Missing Firebase env vars: ${missing.join(", ")}. Add them to .env.local and EAS secrets.`,
        );
    }
}

assertConfig();

export const firebaseApp = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
