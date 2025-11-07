'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
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
  // Use useMemo to initialize Firebase services only once.
  // This runs synchronously with the component's render, ensuring services
  // are available before children attempt to use them.
  const firebaseServices = useMemo<FirebaseServices | null>(() => {
    try {
      // This function now needs to be synchronous. We'll adjust it.
      return initializeFirebase();
    } catch (error) {
      console.error("Failed to initialize Firebase services:", error);
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
