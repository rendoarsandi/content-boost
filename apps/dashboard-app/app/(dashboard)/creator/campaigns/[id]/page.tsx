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

export const dynamic = 'force-dynamic';

async function getCampaignDetails(campaignId: string, creatorId: string) {
  // Mock data for demo purposes - in production this would use actual database
  const mockCampaign = {
    id: campaignId,
    title: 'Summer Product Launch',
    description: 'Promote our new summer collection with engaging content',
    budget: 5000000, // 5 million IDR
    creatorId: creatorId,
    status: 'active',
    createdAt: new Date('2024-01-01').toISOString(),
    startDate: new Date('2024-01-15').toISOString(),
    endDate: new Date('2024-03-15').toISOString(),
  };

  const mockApplications = [
    {
      id: 'app-1',
      campaignId: campaignId,
      status: 'APPROVED',
      appliedAt: new Date('2024-01-10').toISOString(),
      reviewedAt: new Date('2024-01-12').toISOString(),
      promoter: {
        id: 'promoter-1',
        name: 'John Smith',
        email: 'john@example.com',
      },
      viewRecords: [
        { viewCount: 2100, isLegitimate: true },
        { viewCount: 1500, isLegitimate: true },
      ],
      payouts: [
        { amount: 42000 },
        { amount: 31500 },
      ],
    },
  ];

  // Calculate statistics
  const totalViews = mockApplications.reduce(
    (sum, app) =>
      sum +
      app.viewRecords.reduce(
        (viewSum, record) => viewSum + record.viewCount,
        0
      ),
    0
  );

  const legitimateViews = mockApplications.reduce(
    (sum, app) =>
      sum +
      app.viewRecords.reduce(
        (viewSum, record) => viewSum + (record.isLegitimate ? record.viewCount : 0),
        0
      ),
    0
  );

  return {
    campaign: mockCampaign,
    applications: mockApplications,
    stats: {
      totalViews,
      legitimateViews,
    },
  };
}

function getStatusColor(status: string) {
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

export default async function CampaignDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  const { id } = await params;
  const campaignDetails = await getCampaignDetails(
    id,
    (session.user as any).id
  );

  if (!campaignDetails) {
    notFound();
  }

  const { campaign, applications, stats } = campaignDetails;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {campaign.title}
            </h1>
            <Badge className={getStatusColor(campaign.status)}>
              {campaign.status}
            </Badge>
          </div>
          <p className="text-gray-600">
            {campaign.description}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Budget: Rp {campaign.budget.toLocaleString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/creator/campaigns/${campaign.id}/applications`}>
            <Button variant="outline">Manage Applications</Button>
          </Link>
          <Link href="/creator/campaigns">
            <Button variant="outline">Back to Campaigns</Button>
          </Link>
        </div>
      </div>

      {/* Campaign Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              Rp {campaign.budget.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">All promotions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Legitimate Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.legitimateViews.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Bot-free traffic</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Promoters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {applications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Approved applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Campaign Title</p>
              <p className="text-gray-900">{campaign.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Start Date</p>
              <p className="text-gray-900">
                {new Date(campaign.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">End Date</p>
              <p className="text-gray-900">
                {new Date(campaign.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
            <p className="text-gray-700">{campaign.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Applications</span>
            <Link href={`/creator/campaigns/${campaign.id}/applications`}>
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No applications yet. Share your campaign to attract promoters!
            </p>
          ) : (
            <div className="space-y-4">
              {applications.slice(0, 3).map((application) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{application.promoter.name}</h4>
                      <p className="text-sm text-gray-600">{application.promoter.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800">
                        {application.status}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Applied: {new Date(application.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Views:</span>{' '}
                      {application.viewRecords.reduce((sum, record) => sum + record.viewCount, 0).toLocaleString()}
                    </div>
                    <div>
                      <span className="text-gray-500">Earnings:</span>{' '}
                      Rp {application.payouts.reduce((sum, payout) => sum + payout.amount, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}