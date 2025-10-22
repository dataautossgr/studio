'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) return; // Wait until user status is resolved
    
    const isAuthPage = pathname === '/login' || pathname === '/register';

    // If there's no user, redirect to login page, unless they are on an auth page.
    if (!user && !isAuthPage) {
      router.replace('/login');
    }

    // If there is a user and they are on an auth page, redirect to dashboard.
    if (user && isAuthPage) {
      router.replace('/');
    }
  }, [user, isUserLoading, router, pathname]);

  // While loading, show a loading indicator to prevent rendering children prematurely.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // If a user is logged in, show the main application.
  // If no user but on an auth page, allow the auth page to be rendered.
  if (user || isAuthPage) {
    return <>{children}</>;
  }

  // If no user and not on an auth page, this will be null while redirecting.
  return null;
}
