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
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const services = await initializeFirebase();
        setFirebaseServices(services);
      } catch (error) {
        console.error("Failed to initialize Firebase services:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []); 

  if (isLoading || !firebaseServices) {
    return <div className="flex h-screen items-center justify-center">Loading Application...</div>;
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
