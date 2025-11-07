'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore'

let firebaseApp: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let firestore: ReturnType<typeof getFirestore>;
let persistenceEnabled = false;

// This function is now synchronous.
export function initializeFirebase() {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);
  
  // This logic is for development and connects to emulators.
  // For a production build, you would comment out these lines.
  // We're calling this unconditionally for the dev environment.
  console.log('Attempting to connect to Firebase Emulators...');
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  console.log('Emulator connection calls have been made.');

  // Attempt to enable persistence if not already enabled.
  // This is an async operation but we don't need to block rendering for it.
  // We fire and forget it.
  if (typeof window !== 'undefined' && !persistenceEnabled) {
    enableIndexedDbPersistence(firestore)
      .then(() => {
        persistenceEnabled = true;
        console.log("Firebase Offline Persistence Enabled.");
      })
      .catch((err: any) => {
        if (err.code == 'failed-precondition') {
          console.warn('Firebase offline persistence could not be enabled: failed-precondition. This can happen if you have multiple tabs open.');
        } else if (err.code == 'unimplemented') {
          console.warn('Firebase offline persistence is not supported in this browser.');
        }
      });
  }

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
