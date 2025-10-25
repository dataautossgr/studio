'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { StoreSettingsProvider } from '@/context/store-settings-context';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // This now handles both Firebase init and offline persistence
        const services = await initializeFirebase();
        setFirebaseServices(services);
      } catch (error) {
        console.error("Failed to initialize Firebase services:", error);
      } finally {
        // This will only be set to false after persistence is attempted
        setIsLoading(false);
      }
    };

    init();
  }, []); 

  // We are now also waiting for firebaseServices to be available.
  // The StoreSettingsProvider will not render its children until its own internal `isInitialized` is true.
  // This creates a sequential loading gate: Firebase -> Settings -> App.
  if (isLoading || !firebaseServices) {
    return <div className="flex h-screen items-center justify-center">Loading Application...</div>;
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <StoreSettingsProvider>
        {children}
      </StoreSettingsProvider>
    </FirebaseProvider>
  );
}
