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
import { PromoterApplicationActions } from '../../components/promoter-application-actions';

export const dynamic = 'force-dynamic';

async function getApplicationDetails(applicationId: string, creatorId: string) {
  // Mock data for demo purposes - in production this would use actual database
  const mockApplicationData = {
    id: applicationId,
    status: 'PENDING',
    appliedAt: new Date('2024-01-15').toISOString(),
    reviewedAt: null,
    submittedContent: 'https://youtube.com/watch?v=example',
    campaign: {
      id: 'campaign-1',
      title: 'Summer Product Launch',
      description: 'Promote our new summer collection',
      creatorId: creatorId,
    },
    promoter: {
      id: 'promoter-1',
      name: 'John Smith',
      email: 'john@example.com',
    },
    viewRecords: [
      { viewCount: 1250, isLegitimate: true },
      { viewCount: 800, isLegitimate: true },
      { viewCount: 150, isLegitimate: false },
    ],
    payouts: [
      { amount: 25.50 },
      { amount: 18.75 },
    ],
  };

  if (!mockApplicationData) {
    return null;
  }

  // Get performance metrics
  const totalViews = mockApplicationData.viewRecords.reduce(
    (sum, record) => sum + record.viewCount,
    0
  );
  const legitimateViews = mockApplicationData.viewRecords.reduce(
    (sum, record) => sum + (record.isLegitimate ? record.viewCount : 0),
    0
  );
  const estimatedEarnings = mockApplicationData.payouts.reduce(
    (sum, payout) => sum + payout.amount,
    0
  );

  const metrics = {
    totalViews,
    legitimateViews,
    estimatedEarnings,
  };

  return {
    ...mockApplicationData,
    metrics,
    status: mockApplicationData.status,
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
  const applicationDetails = await getApplicationDetails(
    id,
    (session.user as any).id
  );

  if (!applicationDetails) {
    notFound();
  }

  const { campaign, promoter, metrics, ...application } = applicationDetails;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Application Details
            </h1>
            <Badge className={getApplicationStatusColor(application.status)}>
              {application.status}
            </Badge>
          </div>
          <p className="text-gray-600">
            Application from {promoter.name || 'Unknown User'} for "
            {campaign.title}"
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
                    {(promoter.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {promoter.name || 'Unknown User'}
                  </h3>
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
                  <p className="text-sm font-medium text-gray-600">
                    Created Date
                  </p>
                  <p className="text-lg">
                    {new Date(application.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Last Updated
                  </p>
                  <p className="text-lg">
                    {application.reviewedAt
                      ? new Date(application.reviewedAt).toLocaleDateString()
                      : 'Not reviewed'}
                  </p>
                </div>
              </div>

              {application.submittedContent && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Content URL
                  </p>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-800">
                      {application.submittedContent}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Promotion ID
                </p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm text-gray-700 break-all">
                    {application.id}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.totalViews.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {metrics.legitimateViews.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Legitimate Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    Rp {metrics.estimatedEarnings.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Estimated Earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <PromoterApplicationActions
                applicationId={application.id}
                currentStatus={application.status}
              />
            </CardContent>
          </Card>

          {/* Campaign Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Title</p>
                <p className="text-gray-900">{campaign.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Description</p>
                <p className="text-gray-700 text-sm">{campaign.description}</p>
              </div>
              <div className="mt-4">
                <Link href={`/creator/campaigns/${campaign.id}`}>
                  <Button variant="outline" className="w-full">
                    View Full Campaign
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}