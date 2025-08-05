import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, users, viewRecords } from '@repo/database';
// import { eq, and, desc, sum, count } from 'drizzle-orm';
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

async function getPromoterApplications(promoterId: string) {
  // Get promotions (which serve as applications in the current schema)
  const promotions = await db.campaignApplication.findMany({
    where: {
      promoterId: promoterId,
    },
    include: {
      campaign: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      viewRecords: true,
      payouts: true,
    },
    orderBy: {
      appliedAt: 'desc',
    },
  });

  // Convert promotions to application-like structure with stats
  const applications = promotions.map(promotion => ({
    application: {
      id: promotion.id,
      campaignId: promotion.campaignId,
      promoterId: promotion.promoterId,
      status: promotion.status,
      appliedAt: promotion.appliedAt,
      approvedAt: promotion.reviewedAt,
      contentUrl: promotion.submittedContent,
    },
    campaign: promotion.campaign,
    creator: promotion.campaign.creator,
  }));

  // Create viewStats structure for compatibility
  const viewStats = promotions.map(promotion => {
    const totalViews = promotion.viewRecords.reduce((sum, record) => sum + record.viewCount, 0);
    const legitimateViews = promotion.viewRecords.reduce((sum, record) => 
      sum + (record.isLegitimate ? record.viewCount : 0), 0);
    const earnings = promotion.payouts.reduce((sum, payout) => sum + payout.amount, 0);

    return {
      applicationId: promotion.id,
      views: legitimateViews,
      earnings: earnings,
    };
  });

  return { applications, viewStats };
}

function getApplicationStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getCampaignStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'paused':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default async function PromoterApplicationsPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'promoter') {
    redirect('/auth/login');
  }

  const { applications, viewStats } = await getPromoterApplications(
    (session.user as any).id
  );

  const approvedApplications = applications.filter(
    app => app.application.status === 'APPROVED'
  );
  const pendingApplications = applications.filter(
    app => app.application.status === 'PENDING'
  );
  const rejectedApplications = applications.filter(
    app => app.application.status === 'REJECTED'
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-2">
            Track your campaign applications and performance
          </p>
        </div>
        <Link href="/promoter/campaigns">
          <Button>Browse More Campaigns</Button>
        </Link>
      </div>

      {/* Application Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {applications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvedApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rejectedApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Not approved</p>
          </CardContent>
        </Card>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No applications yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start applying to campaigns to see your applications here
            </p>
            <Link href="/promoter/campaigns">
              <Button>Browse Available Campaigns</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Approved Applications */}
          {approvedApplications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">
                  Approved Applications
                </CardTitle>
                <CardDescription>
                  Your active campaigns with performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvedApplications.map(
                    ({ application, campaign, creator }) => {
                      const stats = viewStats.find(
                        s => s.applicationId === application.id
                      );

                      return (
                        <div
                          key={application.id}
                          className="border rounded-lg p-4 bg-green-50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-lg">
                                  {campaign.title}
                                </h3>
                                <Badge
                                  className={getCampaignStatusColor('active')}
                                >
                                  active
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                by {creator.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Approved on{' '}
                                {new Date(
                                  application.appliedAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              className={getApplicationStatusColor(
                                application.status
                              )}
                            >
                              {application.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Campaign Budget</p>
                              <p className="font-semibold text-green-600">
                                Rp {Number(campaign.budget).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Your Views</p>
                              <p className="font-semibold text-blue-600">
                                {stats?.views.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">
                                Estimated Earnings
                              </p>
                              <p className="font-semibold text-purple-600">
                                Rp {stats?.earnings.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Campaign Budget</p>
                              <p className="font-semibold">
                                Rp {Number(campaign.budget).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex space-x-2 mt-4">
                            <Link href={`/promoter/campaigns/${campaign.id}`}>
                              <Button variant="outline" size="sm">
                                View Campaign
                              </Button>
                            </Link>
                            <Link
                              href={`/promoter/applications/${application.id}/content`}
                            >
                              <Button size="sm">Edit Content</Button>
                            </Link>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Applications */}
          {pendingApplications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-700">
                  Pending Applications
                </CardTitle>
                <CardDescription>
                  Applications awaiting creator review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingApplications.map(
                    ({ application, campaign, creator }) => (
                      <div
                        key={application.id}
                        className="border rounded-lg p-4 bg-yellow-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold">{campaign.title}</h3>
                              <Badge
                                className={getApplicationStatusColor(
                                  application.status
                                )}
                              >
                                {application.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              by {creator.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied on{' '}
                              {new Date(
                                application.appliedAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-gray-600">Rate per View</p>
                            <p className="font-semibold text-green-600">
                              Rp {Number(1000).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rejected Applications */}
          {rejectedApplications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">
                  Rejected Applications
                </CardTitle>
                <CardDescription>
                  Applications that were not approved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rejectedApplications.map(
                    ({ application, campaign, creator }) => (
                      <div
                        key={application.id}
                        className="border rounded-lg p-4 bg-red-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold">{campaign.title}</h3>
                              <Badge
                                className={getApplicationStatusColor(
                                  application.status
                                )}
                              >
                                {application.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              by {creator.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Rejected on{' '}
                              {new Date(
                                application.appliedAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-gray-600">Rate per View</p>
                            <p className="font-semibold">
                              Rp {Number(1000).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
