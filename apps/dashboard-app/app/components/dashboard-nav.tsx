'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'creator' | 'promoter' | 'admin';
}

interface DashboardNavProps {
  user: User;
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();

  const creatorNavItems = [
    { href: '/creator', label: 'Dashboard', icon: '📊' },
    { href: '/creator/campaigns', label: 'Campaigns', icon: '🎯' },
    { href: '/creator/promoters', label: 'Promoters', icon: '👥' },
    { href: '/creator/analytics', label: 'Analytics', icon: '📈' },
  ];

  const promoterNavItems = [
    { href: '/promoter', label: 'Dashboard', icon: '📊' },
    { href: '/promoter/campaigns', label: 'Browse Campaigns', icon: '🔍' },
    { href: '/promoter/applications', label: 'My Applications', icon: '📝' },
    { href: '/promoter/earnings', label: 'Earnings', icon: '💰' },
    { href: '/promoter/analytics', label: 'Analytics', icon: '📈' },
  ];

  const navItems =
    (user as any).role === 'creator' ? creatorNavItems : promoterNavItems;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Creator Platform
            </Link>

            <div className="hidden md:flex space-x-4">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{user.name}</span>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs capitalize">
                {(user as any).role}
              </span>
            </div>
            <Button variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
