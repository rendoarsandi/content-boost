'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui';
import {
  LayoutDashboard,
  Target,
  Users,
  BarChart,
  Search,
  FileText,
  DollarSign,
  Settings,
} from 'lucide-react';

interface User {
  role?: string;
}

interface SidebarProps {
  user: User;
}

const creatorNavItems = [
  { href: '/creator', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/creator/campaigns', label: 'Campaigns', icon: Target },
  { href: '/creator/promoters', label: 'Promoters', icon: Users },
  { href: '/creator/analytics', label: 'Analytics', icon: BarChart },
];

const promoterNavItems = [
  { href: '/promoter', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/promoter/campaigns', label: 'Browse Campaigns', icon: Search },
  { href: '/promoter/applications', label: 'My Applications', icon: FileText },
  { href: '/promoter/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/promoter/analytics', label: 'Analytics', icon: BarChart },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const navItems = user.role === 'creator' ? creatorNavItems : promoterNavItems;

  return (
    <aside className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-primary"
          >
            <Target className="h-6 w-6" />
            <span>ContentBoost</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    pathname === item.href && 'bg-muted text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Button size="sm" variant="outline" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </aside>
  );
}
