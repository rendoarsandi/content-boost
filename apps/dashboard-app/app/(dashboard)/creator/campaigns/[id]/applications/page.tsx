import { getSession } from '@repo/auth/server-only';
import { redirect, notFound } from 'next/navigation';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, users, viewRecords } from '@repo/database';
// import { eq, and, sum, count, desc } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@repo/ui';
import Link from 'next/link';
import { PromoterApplicationActions } from '../../../components/promoter-application-actions';

async function getCampaignApplications(campaignId: string, creatorId: string) {
  // Verify campaign ownership
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, creatorId)));

  if (!campaign) {
    return null;
  }

  // Get applications with promoter details
  const applications = await db
    .select({
      application: campaignApplications,
      promoter: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(campaignApplications)
    .innerJoin(users, eq(campaignApplications.promoterId, users.id))
    .where(eq(campaignApplications.campaignId, campaignId))
    .orderBy(desc(campaignApplications.appliedAt));

  // Get performance metrics for approved applications
  const applicationsWithMetrics = await Promise.all(
    applications.map(async (item) => {
      let metrics = null;
      
      if (item.application.status === 'approved') {
        const performanceData = await db
          .select({
            totalViews: sum(viewRecords.viewCount),
            legitimateViews: count(viewRecords.id),
          })
          .from(viewRecords)
          .where(
            and(
              eq(viewRecords.campaignId, campaignId),
              eq(viewRecords.promoterId, item.promoter.id),
              eq(viewRecords.isLegitimate, true)
            )
          );

        const totalViews = Number(performanceData[0]?.totalViews || 0);
        const legitimateViews = Number(performanceData[0]?.legitimateViews || 0);
        const estimatedEarnings = legitimateViews * Number(campaign.ratePerView);

        metrics = {
          totalViews,
          legitimateViews,
          estimatedEarnings,
        };
      }

      return {
        ...item,
        metrics,
      };
    })
  );

  return {
    campaign,
    applications: applicationsWithMetrics,
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

export default async function CampaignApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  const { id } = await params;
  const campaignData = await getCampaignApplications(id, (session.user as any).id);

  if (!campaignData) {
    notFound();
  }

  const { campaign, applications } = campaignData;

  const pendingApplications = applications.filter(app => app.application.status === 'pending');
  const approvedApplications = applications.filter(app => app.application.status === 'approved');
  const rejectedApplications = applications.filter(app => app.application.status === 'rejected');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Applications</h1>
          <p className="text-gray-600 mt-2">
            Managing applications for "{campaign.title}"
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/creator/campaigns/${campaign.id}`}>
            <Button variant="outline">Back to Campaign</Button>
          </Link>
          <Link href="/creator/promoters">
            <Button variant="outline">All Applications</Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Applications</CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvedApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active promoters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rejectedApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⏳</span>
              <span>Pending Applications ({pendingApplications.length})</span>
            </CardTitle>
            <CardDescription>
              Applications waiting for your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApplications.map(({ application, promoter }) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {promoter.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{promoter.name}</h3>
                          <p className="text-sm text-gray-600">{promoter.email}</p>
                        </div>
                      </div>
                      
                      <div className="ml-13">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Applied:</strong> {new Date(application.appliedAt).toLocaleDateString()}
                        </p>
                        
                        {application.submittedContent && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">Submitted Content:</p>
                            <p className="text-sm text-gray-600">{application.submittedContent}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      <Badge className={getApplicationStatusColor(application.status)}>
                        {application.status}
                      </Badge>
                      <PromoterApplicationActions 
                        applicationId={application.id}
                        currentStatus={application.status}
                      />
                      <Link href={`/creator/applications/${application.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Applications */}
      {approvedApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>✅</span>
              <span>Approved Promoters ({approvedApplications.length})</span>
            </CardTitle>
            <CardDescription>
              Active promoters working on this campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvedApplications.map(({ application, promoter, metrics }) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-medium text-lg">
                          {promoter.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{promoter.name}</h3>
                        <p className="text-sm text-gray-600">{promoter.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Approved: {new Date(application.reviewedAt || application.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {metrics && (
                        <div className="grid grid-cols-1 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Views: </span>
                            <span className="font-semibold text-blue-600">
                              {metrics.legitimateViews.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Earnings: </span>
                            <span className="font-semibold text-green-600">
                              Rp {metrics.estimatedEarnings.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      <Link href={`/creator/applications/${application.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  {application.trackingLink && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Tracking Link:</p>
                      <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded border break-all">
                        {application.trackingLink}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Applications */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-600 mb-6">
              Applications will appear here once promoters apply to this campaign
            </p>
            <Link href={`/creator/campaigns/${campaign.id}`}>
              <Button>Back to Campaign</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Applications</CardTitle>
            <CardDescription>
              Complete history of applications for this campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {applications.map(({ application, promoter }) => (
                <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {promoter.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{promoter.name}</p>
                      <p className="text-sm text-gray-600">{promoter.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getApplicationStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(application.appliedAt).toLocaleDateString()}
                    </span>
                    <Link href={`/creator/applications/${application.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}