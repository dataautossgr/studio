'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
    if (!isUserLoading && user) {
        // If user is logged in and on the login page, redirect to dashboard
        if(window.location.pathname === '/login') {
             router.replace('/');
        }
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }
  
  // If no user and not loading, login page will be rendered by Next.js router.
  // We return a simple div to avoid rendering main layout for unauthed users.
  if(!user && window.location.pathname === '/login') {
    return <>{children}</>;
  }

  return null;
}
