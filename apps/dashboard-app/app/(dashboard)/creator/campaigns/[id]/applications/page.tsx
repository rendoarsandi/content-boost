import { redirect, notFound } from 'next/navigation';
import { getSession } from '@repo/auth/server-only';
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
import { PromoterApplicationActions } from '../../../components/promoter-application-actions';

export const dynamic = 'force-dynamic';

async function getCampaignApplications(campaignId: string, creatorId: string) {
  // Mock data for demo purposes - in production this would use actual database
  const mockCampaign = {
    id: campaignId,
    title: 'Summer Product Launch',
    description: 'Promote our new summer collection',
    creatorId: creatorId,
    status: 'active',
    ratePerView: 100,
  };

  const mockApplications = [
    {
      id: 'app-1',
      campaignId: campaignId,
      status: 'PENDING',
      appliedAt: new Date('2024-01-15').toISOString(),
      reviewedAt: null,
      submittedContent: 'https://youtube.com/watch?v=example1',
      promoter: {
        id: 'promoter-1',
        name: 'John Smith',
        email: 'john@example.com',
      },
      viewRecords: [
        { viewCount: 1250, isLegitimate: true },
        { viewCount: 800, isLegitimate: true },
      ],
      payouts: [
        { amount: 25.50 },
      ],
    },
    {
      id: 'app-2',
      campaignId: campaignId,
      status: 'APPROVED',
      appliedAt: new Date('2024-01-10').toISOString(),
      reviewedAt: new Date('2024-01-12').toISOString(),
      submittedContent: 'https://youtube.com/watch?v=example2',
      promoter: {
        id: 'promoter-2',
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
      viewRecords: [
        { viewCount: 2100, isLegitimate: true },
        { viewCount: 1500, isLegitimate: true },
      ],
      payouts: [
        { amount: 42.00 },
        { amount: 31.50 },
      ],
    },
  ];

  // Calculate metrics for each application
  const applicationsWithMetrics = mockApplications.map(item => {
    const totalViews = item.viewRecords.reduce(
      (sum, record) => sum + record.viewCount,
      0
    );
    const legitimateViews = item.viewRecords.reduce(
      (sum, record) => sum + (record.isLegitimate ? record.viewCount : 0),
      0
    );
    const estimatedEarnings = item.payouts.reduce(
      (sum, payout) => sum + payout.amount,
      0
    );

    const metrics = {
      totalViews,
      legitimateViews,
      estimatedEarnings,
    };

    return {
      application: item,
      promoter: item.promoter,
      metrics,
    };
  });

  return {
    campaign: mockCampaign,
    applications: applicationsWithMetrics,
  };
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
  const campaignData = await getCampaignApplications(
    id,
    (session.user as any).id
  );

  if (!campaignData) {
    notFound();
  }

  const { campaign, applications } = campaignData;

  const pendingApplications = applications.filter(
    app => app.application.status === 'PENDING'
  );
  const approvedApplications = applications.filter(
    app => app.application.status === 'APPROVED'
  );
  const rejectedApplications = applications.filter(
    app => app.application.status === 'REJECTED'
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Campaign Applications
          </h1>
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
              Pending Review
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-600">
              Approved
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-600">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rejectedApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Applications Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Applications
              <Badge variant="outline" className="text-yellow-600">
                {pendingApplications.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApplications.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending applications</p>
            ) : (
              pendingApplications.map(({ application, promoter, metrics }) => (
                <div key={application.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{promoter.name}</h4>
                      <p className="text-sm text-gray-600">{promoter.email}</p>
                    </div>
                    <Badge className={getApplicationStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Applied: {new Date(application.appliedAt).toLocaleDateString()}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Views:</span> {metrics.totalViews.toLocaleString()}
                    </div>
                    <div>
                      <span className="text-gray-500">Earnings:</span> Rp {metrics.estimatedEarnings.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Link href={`/creator/applications/${application.id}`}>
                      <Button size="sm" variant="outline" className="text-xs">
                        View Details
                      </Button>
                    </Link>
                  </div>
                  
                  <PromoterApplicationActions
                    applicationId={application.id}
                    currentStatus={application.status}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Approved Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Approved Applications
              <Badge variant="outline" className="text-green-600">
                {approvedApplications.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvedApplications.length === 0 ? (
              <p className="text-gray-500 text-sm">No approved applications</p>
            ) : (
              approvedApplications.map(({ application, promoter, metrics }) => (
                <div key={application.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{promoter.name}</h4>
                      <p className="text-sm text-gray-600">{promoter.email}</p>
                    </div>
                    <Badge className={getApplicationStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Approved: {application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString() : 'N/A'}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Views:</span> {metrics.totalViews.toLocaleString()}
                    </div>
                    <div>
                      <span className="text-gray-500">Earnings:</span> Rp {metrics.estimatedEarnings.toFixed(2)}
                    </div>
                  </div>
                  
                  <Link href={`/creator/applications/${application.id}`}>
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      View Details
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Rejected Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Rejected Applications
              <Badge variant="outline" className="text-red-600">
                {rejectedApplications.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rejectedApplications.length === 0 ? (
              <p className="text-gray-500 text-sm">No rejected applications</p>
            ) : (
              rejectedApplications.map(({ application, promoter, metrics }) => (
                <div key={application.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{promoter.name}</h4>
                      <p className="text-sm text-gray-600">{promoter.email}</p>
                    </div>
                    <Badge className={getApplicationStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Rejected: {application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString() : 'N/A'}
                  </div>
                  
                  <Link href={`/creator/applications/${application.id}`}>
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      View Details
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}