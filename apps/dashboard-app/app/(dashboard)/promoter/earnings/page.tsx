import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
// import { payouts, campaigns, users, viewRecords } from '@repo/database';
// import { eq, sum, count, desc, and, gte } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@repo/ui';
import Link from 'next/link';

async function getPromoterEarnings(promoterId: string) {
  // Get all payouts for the promoter
  const allPayouts = await db
    .select({
      payout: payouts,
      campaign: {
        id: campaigns.id,
        title: campaigns.title,
        ratePerView: campaigns.ratePerView,
      },
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(payouts)
    .innerJoin(campaigns, eq(payouts.campaignId, campaigns.id))
    .innerJoin(users, eq(campaigns.creatorId, users.id))
    .where(eq(payouts.promoterId, promoterId))
    .orderBy(desc(payouts.createdAt));

  // Get earnings summary
  const earningsSummary = await db
    .select({
      status: payouts.status,
      totalAmount: sum(payouts.netAmount),
      count: count(),
    })
    .from(payouts)
    .where(eq(payouts.promoterId, promoterId))
    .groupBy(payouts.status);

  // Get recent earnings (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEarnings = await db
    .select({
      totalAmount: sum(payouts.netAmount),
      count: count(),
    })
    .from(payouts)
    .where(
      and(
        eq(payouts.promoterId, promoterId),
        eq(payouts.status, 'completed'),
        gte(payouts.processedAt, thirtyDaysAgo)
      )
    );

  // Get current month earnings
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const monthlyEarnings = await db
    .select({
      totalAmount: sum(payouts.netAmount),
      count: count(),
    })
    .from(payouts)
    .where(
      and(
        eq(payouts.promoterId, promoterId),
        eq(payouts.status, 'completed'),
        gte(payouts.processedAt, currentMonth)
      )
    );

  // Get total legitimate views
  const totalViews = await db
    .select({
      totalViews: sum(viewRecords.viewCount),
      legitimateViews: count(viewRecords.id),
    })
    .from(viewRecords)
    .where(
      and(
        eq(viewRecords.promoterId, promoterId),
        eq(viewRecords.isLegitimate, true)
      )
    );

  return {
    allPayouts,
    summary: earningsSummary.reduce((acc, item) => {
      acc[item.status] = {
        amount: Number(item.totalAmount || 0),
        count: item.count,
      };
      return acc;
    }, {} as Record<string, { amount: number; count: number }>),
    recentEarnings: {
      amount: Number(recentEarnings[0]?.totalAmount || 0),
      count: recentEarnings[0]?.count || 0,
    },
    monthlyEarnings: {
      amount: Number(monthlyEarnings[0]?.totalAmount || 0),
      count: monthlyEarnings[0]?.count || 0,
    },
    totalViews: {
      total: Number(totalViews[0]?.totalViews || 0),
      legitimate: Number(totalViews[0]?.legitimateViews || 0),
    },
  };
}

function getPayoutStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default async function PromoterEarningsPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'promoter') {
    redirect('/auth/login');
  }

  const earnings = await getPromoterEarnings((session.user as any).id);

  const totalEarnings = earnings.summary.completed?.amount || 0;
  const pendingEarnings = earnings.summary.pending?.amount || 0;
  const processingEarnings = earnings.summary.processing?.amount || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your earnings and payment history</p>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {totalEarnings.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">All-time completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              Rp {earnings.monthlyEarnings.amount.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">{earnings.monthlyEarnings.count} payouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              Rp {earnings.recentEarnings.amount.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">{earnings.recentEarnings.count} payouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              Rp {(pendingEarnings + processingEarnings).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Your overall promotion performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Legitimate Views</p>
                <p className="text-2xl font-bold text-blue-800">
                  {earnings.totalViews.legitimate.toLocaleString()}
                </p>
              </div>
              <div className="text-blue-600 text-2xl">👁️</div>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-green-600 font-medium">Average per View</p>
                <p className="text-2xl font-bold text-green-800">
                  Rp {earnings.totalViews.legitimate > 0 
                    ? Math.round(totalEarnings / earnings.totalViews.legitimate).toLocaleString()
                    : '0'
                  }
                </p>
              </div>
              <div className="text-green-600 text-2xl">💰</div>
            </div>

            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Payouts</p>
                <p className="text-2xl font-bold text-purple-800">
                  {earnings.summary.completed?.count || 0}
                </p>
              </div>
              <div className="text-purple-600 text-2xl">📊</div>
            </div>

            <div className="pt-3 border-t">
              <Link href="/promoter/analytics" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View Detailed Analytics →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Earnings Breakdown</CardTitle>
            <CardDescription>Breakdown by payout status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed Payouts</span>
                <div className="text-right">
                  <span className="font-semibold text-green-600">
                    Rp {totalEarnings.toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-500">
                    {earnings.summary.completed?.count || 0} payments
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Processing</span>
                <div className="text-right">
                  <span className="font-semibold text-blue-600">
                    Rp {processingEarnings.toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-500">
                    {earnings.summary.processing?.count || 0} payments
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <div className="text-right">
                  <span className="font-semibold text-yellow-600">
                    Rp {pendingEarnings.toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-500">
                    {earnings.summary.pending?.count || 0} payments
                  </p>
                </div>
              </div>

              {earnings.summary.failed && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Failed</span>
                  <div className="text-right">
                    <span className="font-semibold text-red-600">
                      Rp {earnings.summary.failed.amount.toLocaleString()}
                    </span>
                    <p className="text-xs text-gray-500">
                      {earnings.summary.failed.count} payments
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Your recent payout transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.allPayouts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No payment history yet</p>
              <p className="text-sm mt-2">Payments will appear here once you start earning from campaigns</p>
            </div>
          ) : (
            <div className="space-y-4">
              {earnings.allPayouts.slice(0, 10).map(({ payout, campaign, creator }) => (
                <div key={payout.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{campaign.title}</h4>
                      <p className="text-sm text-gray-600">by {creator.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Period: {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getPayoutStatusColor(payout.status)}>
                      {payout.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Legitimate Views</p>
                      <p className="font-semibold">{payout.legitimateViews.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rate per View</p>
                      <p className="font-semibold">Rp {Number(payout.ratePerView).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Gross Amount</p>
                      <p className="font-semibold">Rp {Number(payout.grossAmount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Net Amount</p>
                      <p className="font-semibold text-green-600">Rp {Number(payout.netAmount).toLocaleString()}</p>
                    </div>
                  </div>

                  {payout.processedAt && (
                    <div className="mt-3 text-xs text-gray-500">
                      Processed on {new Date(payout.processedAt).toLocaleDateString()}
                    </div>
                  )}

                  {payout.failureReason && (
                    <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
                      Failure reason: {payout.failureReason}
                    </div>
                  )}
                </div>
              ))}

              {earnings.allPayouts.length > 10 && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    Showing 10 of {earnings.allPayouts.length} payments
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}