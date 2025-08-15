'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { PlusCircle, Target, Users, BarChart, DollarSign } from 'lucide-react';
import Link from 'next/link';

// Placeholder data - in a real app, this would come from an API
const stats = [
  {
    title: 'Total Campaigns',
    value: '12',
    icon: Target,
  },
  {
    title: 'Active Promoters',
    value: '86',
    icon: Users,
  },
  {
    title: 'Total Views (30 days)',
    value: '1.2M',
    icon: BarChart,
  },
  {
    title: 'Pending Payouts',
    value: 'Rp 5.750.000',
    icon: DollarSign,
  },
];

export default function CreatorDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome Back, Creator!
          </h1>
          <p className="text-muted-foreground">
            Here's a summary of your account activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/creator/campaigns/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Campaign
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-xl font-semibold mt-6 mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            {/* In a real app, this would be a list or table of recent events */}
            <p className="text-muted-foreground text-center py-8">
              No recent activity to display.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
