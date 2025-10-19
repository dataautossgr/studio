import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
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

export const metadata: Metadata = {
  title: 'Data Autos POS System',
  description: 'A hybrid Point-of-Sale and inventory management application for automotive parts stores.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <Sidebar>
              <SidebarHeader>
                <div className="flex items-center gap-2.5 p-2">
                  <AppLogo />
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold tracking-tight text-sidebar-foreground">
                      Data Autos
                    </h2>
                    <p className="text-xs text-sidebar-foreground/70">
                      POS System
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
              <main className="min-h-[calc(100vh-4rem)]">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
