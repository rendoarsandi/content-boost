import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
// import { campaigns, campaignMaterials, users, campaignApplications } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
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
import { CampaignApplicationForm } from '../../components/campaign-application-form';
import { ApplicationService } from '@repo/utils/application-service';

export const dynamic = 'force-dynamic';

async function getCampaignDetails(campaignId: string, promoterId: string) {
  // Mock data for demo purposes - in production this would use actual database
  const mockCampaign = {
    id: campaignId,
    title: 'Summer Product Launch',
    description: 'Promote our new summer collection with engaging content',
    status: 'active',
    budget: 5000000,
    creatorId: 'creator-1',
    startDate: new Date('2024-01-01').toISOString(),
    endDate: new Date('2024-03-31').toISOString(),
    createdAt: new Date('2023-12-15').toISOString(),
  };

  const mockCreator = {
    id: 'creator-1',
    name: 'Fashion Brand Co',
  };

  // Mock materials for the campaign
  const mockMaterials = [
    {
      id: 'material-1',
      title: 'Product Images',
      description: 'High-quality product photos for promotion',
      type: 'images',
      url: 'https://example.com/images.zip',
    },
    {
      id: 'material-2',
      title: 'Brand Guidelines',
      description: 'Brand colors, fonts, and style guide',
      type: 'document',
      url: 'https://example.com/guidelines.pdf',
    },
  ];

  // Mock application - assume promoter has applied and been approved
  const mockApplication = {
    id: 'app-1',
    status: 'APPROVED',
    appliedAt: new Date('2024-01-15').toISOString(),
  };

  return {
    campaign: mockCampaign,
    creator: mockCreator,
    materials: mockMaterials,
    application: mockApplication,
    hasApplied: true,
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

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'promoter') {
    redirect('/auth/login');
  }

  const { id } = await params;
  const campaignDetails = await getCampaignDetails(
    id,
    (session.user as any).id
  );

  if (!campaignDetails) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Campaign Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          The campaign you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/promoter/campaigns">
          <Button>Browse Other Campaigns</Button>
        </Link>
      </div>
    );
  }

  const { campaign, creator, materials, application, hasApplied } =
    campaignDetails;
  const maxViews = Math.floor(Number(campaign.budget) / Number(1000));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/promoter/campaigns"
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
          >
            ← Back to Campaigns
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
          <p className="text-gray-600 mt-2">by {creator.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor('active')}>{'active'}</Badge>
          {hasApplied && application && (
            <Badge className={getApplicationStatusColor(application.status)}>
              Application: {application.status}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Description */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                Campaign description not available
              </p>
            </CardContent>
          </Card>

          {/* Campaign Materials */}
          {materials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign Materials</CardTitle>
                <CardDescription>
                  {application?.status === 'APPROVED'
                    ? 'Download and use these materials for your promotion'
                    : 'Materials will be available after your application is approved'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {application?.status === 'APPROVED' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materials.map(material => (
                      <div key={material.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{material.title}</h4>
                          <Badge variant="outline">{material.type}</Badge>
                        </div>
                        {material.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {material.description}
                          </p>
                        )}
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Open Material →
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4">🔒</div>
                    <p>
                      Materials are locked until your application is approved
                    </p>
                    <p className="text-sm mt-2">
                      {materials.length} materials available
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Application Status or Form */}
          {hasApplied ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Application</CardTitle>
                <CardDescription>
                  Application submitted on{' '}
                  {new Date(application!.appliedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Status</span>
                  <Badge
                    className={getApplicationStatusColor(application!.status)}
                  >
                    {application!.status}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Tracking Link</h4>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <code className="text-sm text-blue-800">
                      {ApplicationService.generateEnhancedTrackingLink(
                        campaign.id,
                        session.user.id
                      )}
                    </code>
                  </div>
                </div>

                {application!.status === 'APPROVED' && (
                  <div className="flex space-x-3">
                    <Link
                      href={`/promoter/applications/${application!.id}/content`}
                    >
                      <Button>Edit Content</Button>
                    </Link>
                    <Link
                      href={`/promoter/analytics?campaignId=${campaign.id}`}
                    >
                      <Button variant="outline">View Analytics</Button>
                    </Link>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Applied on{' '}
                  {new Date(application!.appliedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ) : (
            !hasApplied && (
              <Card>
                <CardHeader>
                  <CardTitle>Apply to Campaign</CardTitle>
                  <CardDescription>
                    Submit your application to join this campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CampaignApplicationForm campaignId={campaign.id} />
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campaign Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Rate per View</p>
                <p className="text-2xl font-bold text-green-600">
                  Rp {Number(1000).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-xl font-semibold text-blue-600">
                  Rp {Number(campaign.budget).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Maximum Views</p>
                <p className="text-xl font-semibold">
                  {maxViews.toLocaleString()}
                </p>
              </div>

              {campaign.startDate && (
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-medium">
                    {new Date(campaign.startDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Creator Info */}
          <Card>
            <CardHeader>
              <CardTitle>Creator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {creator.name?.charAt(0).toUpperCase() ?? 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{creator.name ?? 'Unknown'}</p>
                  <p className="text-sm text-gray-600">Content Creator</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/promoter/campaigns" className="block">
                <Button variant="outline" className="w-full">
                  Browse More Campaigns
                </Button>
              </Link>
              <Link href="/promoter/applications" className="block">
                <Button variant="outline" className="w-full">
                  My Applications
                </Button>
              </Link>
              {application?.status === 'APPROVED' && (
                <Link href="/promoter/analytics" className="block">
                  <Button variant="outline" className="w-full">
                    View Analytics
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
