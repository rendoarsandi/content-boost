import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
import { campaigns, campaignApplications, viewRecords } from '@repo/database';
import { eq, count, sum, and, gte } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@repo/ui';
import Link from 'next/link';

async function getCreatorStats(creatorId: string) {
  // Get campaign counts by status
  const campaignStats = await db
    .select({
      status: campaigns.status,
      count: count(),
    })
    .from(campaigns)
    .where(eq(campaigns.creatorId, creatorId))
    .groupBy(campaigns.status);

  // Get total applications
  const applicationStats = await db
    .select({
      count: count(),
    })
    .from(campaignApplications)
    .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
    .where(eq(campaigns.creatorId, creatorId));

  // Get recent view metrics (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const viewStats = await db
    .select({
      totalViews: sum(viewRecords.viewCount),
      legitimateViews: sum(viewRecords.viewCount),
    })
    .from(viewRecords)
    .innerJoin(campaigns, eq(viewRecords.campaignId, campaigns.id))
    .where(
      and(
        eq(campaigns.creatorId, creatorId),
        gte(viewRecords.timestamp, sevenDaysAgo),
        eq(viewRecords.isLegitimate, true)
      )
    );

  return {
    campaigns: campaignStats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      return acc;
    }, {} as Record<string, number>),
    totalApplications: applicationStats[0]?.count || 0,
    totalViews: Number(viewStats[0]?.totalViews || 0),
    legitimateViews: Number(viewStats[0]?.legitimateViews || 0),
  };
}

export default async function CreatorDashboard() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  const stats = await getCreatorStats((session.user as any).id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {(session.user as any).name}!</p>
        </div>
        <Link href="/creator/campaigns/new">
          <Button>Create New Campaign</Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.campaigns.active || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalApplications}
            </div>
            <p className="text-xs text-gray-500 mt-1">Promoter applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Views (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.legitimateViews.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Legitimate views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Draft Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.campaigns.draft || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Ready to launch</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🎯</span>
              <span>Campaign Management</span>
            </CardTitle>
            <CardDescription>
              Create and manage your promotion campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/creator/campaigns/new">
              <Button className="w-full">Create New Campaign</Button>
            </Link>
            <Link href="/creator/campaigns">
              <Button variant="outline" className="w-full">View All Campaigns</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>👥</span>
              <span>Promoter Management</span>
            </CardTitle>
            <CardDescription>
              Review and manage promoter applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/creator/promoters">
              <Button className="w-full">Review Applications</Button>
            </Link>
            <Link href="/creator/promoters/approved">
              <Button variant="outline" className="w-full">Approved Promoters</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📈</span>
              <span>Analytics & Reports</span>
            </CardTitle>
            <CardDescription>
              Track performance and view detailed analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/creator/analytics">
              <Button className="w-full">View Analytics</Button>
            </Link>
            <Link href="/creator/analytics/reports">
              <Button variant="outline" className="w-full">Download Reports</Button>
            </Link>
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
            <p className="text-sm mt-2">Activity will appear here once you have active campaigns</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}