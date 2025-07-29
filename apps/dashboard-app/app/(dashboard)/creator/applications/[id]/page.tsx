import { getSession } from '@repo/auth/server-only';
import { redirect, notFound } from 'next/navigation';
import { db } from '@repo/database';
// import { campaignApplications, campaigns, users, viewRecords } from '@repo/database';
// import { eq, and, sum, count } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@repo/ui';
import Link from 'next/link';
import { PromoterApplicationActions } from '../../components/promoter-application-actions';

async function getApplicationDetails(applicationId: string, creatorId: string) {
  // Get application with campaign and promoter details
  const [applicationData] = await db
    .select({
      application: campaignApplications,
      campaign: campaigns,
      promoter: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(campaignApplications)
    .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
    .innerJoin(users, eq(campaignApplications.promoterId, users.id))
    .where(
      and(
        eq(campaignApplications.id, applicationId),
        eq(campaigns.creatorId, creatorId)
      )
    );

  if (!applicationData) {
    return null;
  }

  // Get performance metrics if approved
  let metrics = null;
  if (applicationData.application.status === 'approved') {
    const performanceData = await db
      .select({
        totalViews: sum(viewRecords.viewCount),
        legitimateViews: count(viewRecords.id),
      })
      .from(viewRecords)
      .where(
        and(
          eq(viewRecords.campaignId, applicationData.campaign.id),
          eq(viewRecords.promoterId, applicationData.promoter.id),
          eq(viewRecords.isLegitimate, true)
        )
      );

    const totalViews = Number(performanceData[0]?.totalViews || 0);
    const legitimateViews = Number(performanceData[0]?.legitimateViews || 0);
    const estimatedEarnings = legitimateViews * Number(applicationData.campaign.ratePerView);

    metrics = {
      totalViews,
      legitimateViews,
      estimatedEarnings,
    };
  }

  return {
    ...applicationData,
    metrics,
  };
}

function getApplicationStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default async function ApplicationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  const { id } = await params;
  const applicationDetails = await getApplicationDetails(id, (session.user as any).id);

  if (!applicationDetails) {
    notFound();
  }

  const { application, campaign, promoter, metrics } = applicationDetails;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Application Details</h1>
            <Badge className={getApplicationStatusColor(application.status)}>
              {application.status}
            </Badge>
          </div>
          <p className="text-gray-600">
            Application from {promoter.name} for "{campaign.title}"
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/creator/promoters">
            <Button variant="outline">Back to Applications</Button>
          </Link>
          <Link href={`/creator/campaigns/${campaign.id}`}>
            <Button variant="outline">View Campaign</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Application Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Promoter Information */}
          <Card>
            <CardHeader>
              <CardTitle>Promoter Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-xl">
                    {promoter.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{promoter.name}</h3>
                  <p className="text-gray-600">{promoter.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Details */}
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Applied Date</p>
                  <p className="text-lg">{new Date(application.appliedAt).toLocaleDateString()}</p>
                </div>
                {application.reviewedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Reviewed Date</p>
                    <p className="text-lg">{new Date(application.reviewedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {application.submittedContent && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Submitted Content</p>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-800">{application.submittedContent}</p>
                  </div>
                </div>
              )}

              {application.trackingLink && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Tracking Link</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-sm text-gray-700 break-all">
                      {application.trackingLink}
                    </code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics (if approved) */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Current performance data for this promoter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {metrics.legitimateViews.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Legitimate Views</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      Rp {metrics.estimatedEarnings.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Estimated Earnings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      Rp {Number(campaign.ratePerView).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Rate per View</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campaign Information */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Campaign Title</p>
                <p className="font-semibold">{campaign.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge className={
                  campaign.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : campaign.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }>
                  {campaign.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Budget</p>
                <p className="font-semibold">Rp {Number(campaign.budget).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Rate per View</p>
                <p className="font-semibold">Rp {Number(campaign.ratePerView).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {application.status === 'pending' ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    Review this application and decide whether to approve or reject it.
                  </p>
                  <PromoterApplicationActions 
                    applicationId={application.id}
                    currentStatus={application.status}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This application has been {application.status}.
                  </p>
                  {application.status === 'approved' && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✅ This promoter is now actively working on your campaign.
                      </p>
                    </div>
                  )}
                  {application.status === 'rejected' && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-800">
                        ❌ This application was rejected and the promoter has been notified.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}