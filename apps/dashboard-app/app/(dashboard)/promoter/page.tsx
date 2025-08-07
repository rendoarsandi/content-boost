import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from '@repo/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getPromoterStats(promoterId: string) {
  // Get promotions for this promoter
  const promotions = await db.campaignApplication.findMany({
    where: {
      promoterId,
    },
    include: {
      campaign: true,
      viewRecords: true,
      payouts: true,
    },
  });

  // Calculate basic stats from promotions
  const totalPromotions = promotions.length;
  const totalViews = promotions.reduce((sum, p) => {
    const legitimateViews = p.viewRecords.reduce(
      (viewSum, record) =>
        viewSum + (record.isLegitimate ? record.viewCount : 0),
      0
    );
    return sum + legitimateViews;
  }, 0);
  const totalEarnings = promotions.reduce((sum, p) => {
    const earnings = p.payouts.reduce(
      (payoutSum, payout) => payoutSum + payout.amount,
      0
    );
    return sum + earnings;
  }, 0);

  return {
    applications: {
      approved: totalPromotions,
      pending: 0,
      rejected: 0,
    },
    legitimateViews: totalViews,
    totalEarnings: totalEarnings,
    recentEarnings: totalEarnings, // Add missing recentEarnings property
    completedPayouts: 0, // Add missing completedPayouts property
    recentPayouts: [],
  };
}

export default async function PromoterDashboard() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'promoter') {
    redirect('/auth/login');
  }

  const stats = await getPromoterStats((session.user as any).id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Promoter Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {(session.user as any).name}!
          </p>
        </div>
        <Link href="/promoter/campaigns">
          <Button>Browse Campaigns</Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.applications.approved || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Approved campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Views (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.legitimateViews.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Legitimate views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Earnings (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              Rp {stats.recentEarnings.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Recent earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.applications.pending || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🔍</span>
              <span>Find Campaigns</span>
            </CardTitle>
            <CardDescription>
              Discover new promotion opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/promoter/campaigns">
              <Button className="w-full">Browse Available Campaigns</Button>
            </Link>
            <Link href="/promoter/campaigns?filter=high-paying">
              <Button variant="outline" className="w-full">
                High-Paying Campaigns
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📝</span>
              <span>My Applications</span>
            </CardTitle>
            <CardDescription>Track your campaign applications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/promoter/applications">
              <Button className="w-full">View All Applications</Button>
            </Link>
            <Link href="/promoter/applications?status=pending">
              <Button variant="outline" className="w-full">
                Pending Reviews
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>💰</span>
              <span>Earnings & Payouts</span>
            </CardTitle>
            <CardDescription>
              Track your earnings and payment history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/promoter/earnings">
              <Button className="w-full">View Earnings</Button>
            </Link>
            <Link href="/promoter/earnings/history">
              <Button variant="outline" className="w-full">
                Payment History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>
              Your promotion performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Total Legitimate Views
                </p>
                <p className="text-2xl font-bold text-blue-800">
                  {stats.legitimateViews.toLocaleString()}
                </p>
              </div>
              <div className="text-blue-600 text-2xl">👁️</div>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-green-600 font-medium">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold text-green-800">
                  Rp {stats.totalEarnings.toLocaleString()}
                </p>
              </div>
              <div className="text-green-600 text-2xl">💰</div>
            </div>

            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-purple-600 font-medium">
                  Completed Payouts
                </p>
                <p className="text-2xl font-bold text-purple-800">
                  {stats.completedPayouts}
                </p>
              </div>
              <div className="text-purple-600 text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>
              Overview of your campaign applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Approved Applications
                </span>
                <span className="font-semibold text-green-600">
                  {stats.applications.approved || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Pending Applications
                </span>
                <span className="font-semibold text-yellow-600">
                  {stats.applications.pending || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Rejected Applications
                </span>
                <span className="font-semibold text-red-600">
                  {stats.applications.rejected || 0}
                </span>
              </div>

              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    Total Applications
                  </span>
                  <span className="font-bold text-blue-600">
                    {Object.values(stats.applications).reduce(
                      (sum, count) => sum + count,
                      0
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity to display</p>
            <p className="text-sm mt-2">
              Activity will appear here once you have active campaigns
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
