'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

let firebaseApp: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let firestore: ReturnType<typeof getFirestore>;
let persistenceEnabled = false;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export async function initializeFirebase() {
  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.error('Firebase initialization error', e);
      // Fallback for environments where config is needed.
      if (!getApps().length) {
         firebaseApp = initializeApp(firebaseConfig);
      } else {
         firebaseApp = getApp();
      }
    }
  } else {
    firebaseApp = getApp();
  }

  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);

  if (!persistenceEnabled) {
    try {
      await enableIndexedDbPersistence(firestore);
      persistenceEnabled = true;
      console.log("Firebase Offline Persistence Enabled.");
    } catch (err: any) {
      if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one.
        console.warn('Firebase offline persistence could not be enabled: failed-precondition. This can happen if you have multiple tabs open.');
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn('Firebase offline persistence is not supported in this browser.');
      }
      // We can still continue with the app, just without offline support.
    }
  }

  return { firebaseApp, auth, firestore };
}

// This function is kept for any part of the app that might still use it synchronously,
// but it will not guarantee offline persistence.
// The async initializeFirebase should be preferred.
export function getSdks(appInstance: FirebaseApp) {
  return {
    firebaseApp: appInstance,
    auth: getAuth(appInstance),
    firestore: getFirestore(appInstance)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
