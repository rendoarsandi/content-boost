import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
import { campaigns, viewRecords, payouts } from '@repo/database';
import { eq, sum, count, gte, and, desc } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';

async function getCreatorAnalytics(creatorId: string) {
  // Get date ranges
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get campaign performance
  const campaignPerformance = await db
    .select({
      campaign: {
        id: campaigns.id,
        title: campaigns.title,
        status: campaigns.status,
        budget: campaigns.budget,
        ratePerView: campaigns.ratePerView,
      },
      totalViews: sum(viewRecords.viewCount),
      legitimateViews: count(viewRecords.id),
    })
    .from(campaigns)
    .leftJoin(viewRecords, and(
      eq(viewRecords.campaignId, campaigns.id),
      eq(viewRecords.isLegitimate, true)
    ))
    .where(eq(campaigns.creatorId, creatorId))
    .groupBy(campaigns.id)
    .orderBy(desc(campaigns.createdAt));

  // Get recent view trends (last 7 days)
  const recentViews = await db
    .select({
      totalViews: sum(viewRecords.viewCount),
      legitimateViews: count(viewRecords.id),
    })
    .from(viewRecords)
    .innerJoin(campaigns, eq(viewRecords.campaignId, campaigns.id))
    .where(
      and(
        eq(campaigns.creatorId, creatorId),
        gte(viewRecords.timestamp, last7Days),
        eq(viewRecords.isLegitimate, true)
      )
    );

  // Get monthly view trends (last 30 days)
  const monthlyViews = await db
    .select({
      totalViews: sum(viewRecords.viewCount),
      legitimateViews: count(viewRecords.id),
    })
    .from(viewRecords)
    .innerJoin(campaigns, eq(viewRecords.campaignId, campaigns.id))
    .where(
      and(
        eq(campaigns.creatorId, creatorId),
        gte(viewRecords.timestamp, last30Days),
        eq(viewRecords.isLegitimate, true)
      )
    );

  // Get total spending (from payouts)
  const totalSpending = await db
    .select({
      totalSpent: sum(payouts.grossAmount),
      totalPayouts: count(payouts.id),
    })
    .from(payouts)
    .innerJoin(campaigns, eq(payouts.campaignId, campaigns.id))
    .where(eq(campaigns.creatorId, creatorId));

  return {
    campaignPerformance,
    recentViews: {
      totalViews: Number(recentViews[0]?.totalViews || 0),
      legitimateViews: Number(recentViews[0]?.legitimateViews || 0),
    },
    monthlyViews: {
      totalViews: Number(monthlyViews[0]?.totalViews || 0),
      legitimateViews: Number(monthlyViews[0]?.legitimateViews || 0),
    },
    totalSpending: {
      totalSpent: Number(totalSpending[0]?.totalSpent || 0),
      totalPayouts: Number(totalSpending[0]?.totalPayouts || 0),
    },
  };
}

export default async function CreatorAnalyticsPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  const analytics = await getCreatorAnalytics((session.user as any).id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your campaign performance and metrics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Views (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analytics.recentViews.legitimateViews.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Legitimate views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Views (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.monthlyViews.legitimateViews.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Legitimate views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              Rp {analytics.totalSpending.totalSpent.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">All-time spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {analytics.totalSpending.totalPayouts}
            </div>
            <p className="text-xs text-gray-500 mt-1">Completed payouts</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Performance metrics for all your campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.campaignPerformance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No campaign data available</p>
              <p className="text-sm mt-2">Create campaigns to see performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.campaignPerformance.map((item) => {
                const totalViews = Number(item.totalViews || 0);
                const legitimateViews = Number(item.legitimateViews || 0);
                const budget = Number(item.campaign.budget);
                const ratePerView = Number(item.campaign.ratePerView);
                const estimatedSpent = legitimateViews * ratePerView;
                const budgetUsed = budget > 0 ? (estimatedSpent / budget) * 100 : 0;

                return (
                  <div key={item.campaign.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{item.campaign.title}</h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          item.campaign.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : item.campaign.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : item.campaign.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.campaign.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Legitimate Views</p>
                        <p className="font-semibold text-lg">{legitimateViews.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Budget Used</p>
                        <p className="font-semibold text-lg">{budgetUsed.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Estimated Spent</p>
                        <p className="font-semibold text-lg">Rp {estimatedSpent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Rate per View</p>
                        <p className="font-semibold text-lg">Rp {ratePerView.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Budget Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Budget Progress</span>
                        <span>Rp {estimatedSpent.toLocaleString()} / Rp {budget.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key insights from your campaign data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.campaignPerformance.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No insights available yet. Create and launch campaigns to see performance insights.
              </p>
            ) : (
              <>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">📈 Growth Trend</h4>
                  <p className="text-blue-800 text-sm">
                    You've received {analytics.recentViews.legitimateViews.toLocaleString()} legitimate views 
                    in the last 7 days and {analytics.monthlyViews.legitimateViews.toLocaleString()} in the last 30 days.
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">💰 Spending Efficiency</h4>
                  <p className="text-green-800 text-sm">
                    Total spending: Rp {analytics.totalSpending.totalSpent.toLocaleString()} 
                    across {analytics.totalSpending.totalPayouts} completed payouts.
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">🎯 Campaign Status</h4>
                  <p className="text-purple-800 text-sm">
                    You have {analytics.campaignPerformance.length} total campaigns. 
                    Monitor your active campaigns to optimize performance.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}