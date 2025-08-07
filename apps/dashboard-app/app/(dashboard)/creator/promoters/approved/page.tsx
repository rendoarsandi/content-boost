import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
// import { campaignApplications, campaigns, users, viewRecords } from '@repo/database';
// import { eq, and, sum, count } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@repo/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getApprovedPromoters(creatorId: string) {
  // Get all campaigns for this creator
  const campaigns = await db.campaign.findMany({
    where: {
      creatorId: creatorId,
    },
    include: {
      applications: {
        where: {
          status: 'APPROVED',
        },
        include: {
          promoter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          viewRecords: true,
          payouts: true,
        },
      },
    },
  });

  // Transform promotions into the expected format
  const promotersWithMetrics = campaigns.flatMap(campaign =>
    campaign.applications.map(promotion => {
      // Calculate metrics from related data
      const totalViews = promotion.viewRecords.reduce(
        (sum, record) => sum + record.viewCount,
        0
      );
      const legitimateViews = promotion.viewRecords.reduce(
        (sum, record) => sum + (record.isLegitimate ? record.viewCount : 0),
        0
      );
      const estimatedEarnings = promotion.payouts.reduce(
        (sum, payout) => sum + payout.amount,
        0
      );

      return {
        application: { ...promotion, status: 'APPROVED' },
        campaign: {
          id: campaign.id,
          title: campaign.title,
          status: 'active',
          ratePerView: campaign.ratePerView || 100,
        },
        promoter: promotion.promoter,
        metrics: {
          totalViews,
          legitimateViews,
          estimatedEarnings,
        },
      };
    })
  );

  return promotersWithMetrics;
}

export default async function ApprovedPromotersPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  const approvedPromoters = await getApprovedPromoters(
    (session.user as any).id
  );

  // Group promoters by campaign
  const promotersByCampaign = approvedPromoters.reduce(
    (acc, promoter) => {
      const campaignId = promoter.campaign.id;
      if (!acc[campaignId]) {
        acc[campaignId] = {
          campaign: promoter.campaign,
          promoters: [],
        };
      }
      acc[campaignId].promoters.push(promoter);
      return acc;
    },
    {} as Record<string, { campaign: any; promoters: any[] }>
  );

  const totalApprovedPromoters = approvedPromoters.length;
  const totalViews = approvedPromoters.reduce(
    (sum, p) => sum + p.metrics.legitimateViews,
    0
  );
  const totalEarnings = approvedPromoters.reduce(
    (sum, p) => sum + p.metrics.estimatedEarnings,
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Approved Promoters
          </h1>
          <p className="text-gray-600 mt-2">
            Active promoters working on your campaigns
          </p>
        </div>
        <Link href="/creator/promoters">
          <Button variant="outline">Back to All Applications</Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Promoters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalApprovedPromoters}
            </div>
            <p className="text-xs text-gray-500 mt-1">Approved and active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Legitimate views generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              Rp {totalEarnings.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Estimated promoter earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {totalApprovedPromoters === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No approved promoters yet
            </h3>
            <p className="text-gray-600 mb-6">
              Approved promoters will appear here once you approve applications
            </p>
            <Link href="/creator/promoters">
              <Button>Review Pending Applications</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(promotersByCampaign).map(
            ([campaignId, { campaign, promoters }]) => (
              <Card key={campaignId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{campaign.title}</span>
                        <Badge
                          className={
                            campaign.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : campaign.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {promoters.length} approved promoter
                        {promoters.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <Link href={`/creator/campaigns/${campaignId}`}>
                      <Button variant="outline" size="sm">
                        View Campaign
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {promoters.map(promoter => (
                      <div
                        key={`${promoter.promoter.id}-${campaignId}`}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-lg">
                                {(promoter.promoter.name || 'U')
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {promoter.promoter.name || 'Unknown User'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {promoter.promoter.email}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Approved:{' '}
                                {new Date(
                                  promoter.application.reviewedAt ||
                                    promoter.application.appliedAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Views: </span>
                                <span className="font-semibold text-blue-600">
                                  {promoter.metrics.legitimateViews.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Earnings:{' '}
                                </span>
                                <span className="font-semibold text-green-600">
                                  Rp{' '}
                                  {promoter.metrics.estimatedEarnings.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {promoter.application.trackingLink && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Tracking Link:
                            </p>
                            <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                              {promoter.application.trackingLink}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
