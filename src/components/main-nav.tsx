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
  Wallet,
  Wrench,
  Battery,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/sales', label: 'Sales', icon: Receipt },
  { href: '/repair-jobs', label: 'Temporary Bill', icon: Wrench },
  { href: '/purchase', label: 'Purchase', icon: ShoppingBag },
  { href: '/dealers', label: 'Dealers', icon: Building },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/expenses', label: 'Expenses', icon: CreditCard },
  { href: '/cash-flow', label: 'Cash Flow', icon: Wallet },
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
         <SidebarMenuItem>
            <Collapsible>
                <CollapsibleTrigger asChild className="w-full">
                    <SidebarMenuButton
                        className="w-full"
                        isActive={pathname.startsWith('/batteries')}
                        tooltip="Batteries"
                    >
                        <Battery />
                        <span>Batteries</span>
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={pathname.startsWith('/batteries/sales')}>
                                <Link href="/sales">Battery Sales</Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={pathname.startsWith('/batteries/stock')}>
                                <Link href="/batteries/stock">Battery Stock</Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={pathname.startsWith('/batteries/purchases')}>
                                <Link href="/batteries/purchases">Purchases</Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    </SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
         </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
