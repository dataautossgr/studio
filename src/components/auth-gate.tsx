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

    // If there's no user, redirect to login page, unless they are already there.
    if (!user && pathname !== '/login') {
      router.replace('/login');
    }

    // If there is a user and they are on the login page, redirect to dashboard.
    if (user && pathname === '/login') {
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

  // If a user is logged in, show the main application.
  // If no user but on the login page, allow the login page to be rendered.
  if (user || pathname === '/login') {
    return <>{children}</>;
  }

  // If no user and not on the login page, this will be null while redirecting.
  return null;
}
