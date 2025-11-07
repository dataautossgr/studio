'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { AuthGate } from '@/components/auth-gate';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo still ensures this only runs once, but now it's just getting the
  // already-configured instances from the module scope.
  const firebaseServices = useMemo<FirebaseServices | null>(() => {
    try {
      return initializeFirebase();
    } catch (error) {
      console.error("Failed to get Firebase services:", error);
      return null;
    }
  }, []);

  if (!firebaseServices) {
    return <div className="flex h-screen items-center justify-center">Error initializing Firebase. Check console.</div>;
  }

  return (
    <FirebaseProvider
        firebaseApp={firebaseServices.firebaseApp}
        auth={firebaseServices.auth}
        firestore={firebaseServices.firestore}
        >
        <AuthGate>
            {children}
        </AuthGate>
    </FirebaseProvider>
  );
}
