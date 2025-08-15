'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import {
  PlusCircle,
  Search,
  FileText,
  DollarSign,
  BarChart,
  Eye,
  CheckCircle,
  List,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// This is a mock of the data fetching logic for the sake of UI development
// In a real app, you'd use a proper data fetching library like SWR or React Query
async function getPromoterStats(promoterId: string) {
  // Mock data
  return {
    applications: {
      approved: 5,
      pending: 2,
      rejected: 1,
    },
    legitimateViews: 25600,
    totalEarnings: 1250000,
  };
}

export default function PromoterDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchUserAndStats = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const promoterStats = await getPromoterStats(session.user.id);
        setStats(promoterStats);
      }
      setLoading(false);
    };

    fetchUserAndStats();
  }, []);

  if (loading || !stats) {
    return <div>Loading...</div>; // Or a proper skeleton loader
  }

  const summaryStats = [
    {
      title: 'Active Promotions',
      value: stats.applications.approved,
      icon: CheckCircle,
    },
    {
      title: 'Total Earnings',
      value: `Rp ${stats.totalEarnings.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      title: 'Total Views',
      value: stats.legitimateViews.toLocaleString(),
      icon: Eye,
    },
    {
      title: 'Pending Applications',
      value: stats.applications.pending,
      icon: List,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome Back, {user?.user_metadata?.name || 'Promoter'}!
          </h1>
          <p className="text-muted-foreground">
            Here's a summary of your promotion activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/promoter/campaigns">
            <Search className="mr-2 h-4 w-4" />
            Browse New Campaigns
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat, index) => {
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
        <h2 className="text-xl font-semibold mt-6 mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:bg-muted/50">
            <Link href="/promoter/applications" className="block p-6">
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">My Applications</h3>
                  <p className="text-sm text-muted-foreground">
                    View the status of all your applications.
                  </p>
                </div>
              </div>
            </Link>
          </Card>
          <Card className="hover:bg-muted/50">
            <Link href="/promoter/earnings" className="block p-6">
              <div className="flex items-center gap-4">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Earnings History</h3>
                  <p className="text-sm text-muted-foreground">
                    Track your payouts and earnings.
                  </p>
                </div>
              </div>
            </Link>
          </Card>
          <Card className="hover:bg-muted/50">
            <Link href="/promoter/analytics" className="block p-6">
              <div className="flex items-center gap-4">
                <BarChart className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Performance Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Analyze your promotion performance.
                  </p>
                </div>
              </div>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
