import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@repo/ui';
import Link from 'next/link';

async function getPromoterEarnings(promoterId: string) {
  // TODO: Add Payout and ViewRecord models to Prisma schema
  // Return stub data for now
  return {
    payouts: [],
    summary: {},
    recentEarnings: {
      amount: 0,
      count: 0,
    },
    monthlyEarnings: {
      amount: 0,
      count: 0,
    },
    totalViews: {
      total: 0,
      legitimate: 0,
    },
  };
}

function getPayoutStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-600 mt-2">
          Track your campaign earnings and payouts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {earnings.monthlyEarnings.amount.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {earnings.monthlyEarnings.count} payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {earnings.recentEarnings.amount.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {earnings.recentEarnings.count} payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {earnings.totalViews.total.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {earnings.totalViews.legitimate} legitimate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
          <CardDescription>
            Your latest earnings and payout history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.payouts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No earnings yet
              </h3>
              <p className="text-gray-500 mb-4">
                Start promoting campaigns to earn money and see your payouts
                here.
              </p>
              <Link href="/promoter/campaigns">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Browse Campaigns
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">{/* Payout list would go here */}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
