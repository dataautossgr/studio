'use client';

import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  CreditCard,
  ShoppingBag,
  Building,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/sales', label: 'Sales', icon: Receipt },
  { href: '/purchase', label: 'Purchase', icon: ShoppingBag },
  { href: '/dealers', label: 'Dealers', icon: Building },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/expenses', label: 'Expenses', icon: CreditCard },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="flex w-full flex-col gap-2 p-2">
      <SidebarMenu>
        {links.map((link) => (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={
                link.href === '/'
                  ? pathname === link.href
                  : pathname.startsWith(link.href)
              }
              tooltip={link.label}
            >
              <Link href={link.href}>
                <link.icon />
                <span>{link.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </div>
  );
}
