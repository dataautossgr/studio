'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Header } from '@/components/header';
import { AppLogo } from '@/components/icons';
import { useStoreSettings } from '@/context/store-settings-context';
import Image from 'next/image';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
    const { settings } = useStoreSettings();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2.5 p-2">
            <div className="h-8 w-8 relative">
                {settings.logo ? (
                    <Image src={settings.logo} alt={settings.storeName} layout="fill" className="object-contain" />
                ) : (
                    <AppLogo />
                )}
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-bold tracking-tight text-sidebar-foreground">
                {settings.storeName}
              </h2>
              <p className="text-xs text-sidebar-foreground/70">
                POS by hamxa tech 🐧 (03173890161)
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
