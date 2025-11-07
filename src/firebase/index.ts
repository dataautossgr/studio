'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// --- Singleton Pattern ---
// These flags prevent re-initialization and race conditions.
let persistenceEnabled = false;
let emulatorsConnected = false;

// Initialize Firebase App (runs only once)
if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

auth = getAuth(firebaseApp);
firestore = getFirestore(firebaseApp);

// This entire block runs only on the client-side.
if (typeof window !== 'undefined') {
  // --- Emulator Connection (MUST run before persistence) ---
  if (!emulatorsConnected) {
    console.log('Attempting to connect to Firebase Emulators...');
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    emulatorsConnected = true;
    console.log('Emulator connection calls have been made.');
  }

  // --- Offline Persistence (runs after emulator connection) ---
  if (!persistenceEnabled) {
    enableIndexedDbPersistence(firestore)
      .then(() => {
        persistenceEnabled = true;
        console.log("Firebase Offline Persistence Enabled.");
      })
      .catch((err: any) => {
        if (err.code == 'failed-precondition') {
          console.warn('Firebase offline persistence could not be enabled: failed-precondition. This can happen if you have multiple tabs open. The app will still work, but offline capabilities will be limited.');
        } else if (err.code == 'unimplemented') {
          console.warn('Firebase offline persistence is not supported in this browser.');
        } else {
          console.error("An error occurred while enabling persistence:", err);
        }
      });
  }
}

// This function now simply returns the already-initialized instances.
export function initializeFirebase() {
  return { firebaseApp, auth, firestore };
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';