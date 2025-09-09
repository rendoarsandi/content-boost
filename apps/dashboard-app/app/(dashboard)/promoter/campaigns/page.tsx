import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
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

async function getAvailableCampaigns(promoterId: string) {
  // Mock data for demo purposes - in production this would use actual database
  const mockCampaigns = [
    {
      id: 'campaign-1',
      title: 'Summer Product Launch',
      description: 'Promote our new summer collection',
      status: 'active',
      budget: 5000000,
      createdAt: new Date('2024-01-01').toISOString(),
      creator: {
        id: 'creator-1',
        name: 'Fashion Brand Co',
      },
    },
    {
      id: 'campaign-2',
      title: 'Winter Holiday Sale',
      description: 'Special holiday promotion campaign',
      status: 'active',
      budget: 3000000,
      createdAt: new Date('2024-02-01').toISOString(),
      creator: {
        id: 'creator-2',
        name: 'Tech Startup Inc',
      },
    },
    {
      id: 'campaign-3',
      title: 'Spring Collection Preview',
      description: 'Early access to spring collection',
      status: 'active',
      budget: 2000000,
      createdAt: new Date('2024-03-01').toISOString(),
      creator: {
        id: 'creator-3',
        name: 'Lifestyle Brand Ltd',
      },
    },
  ];

  return mockCampaigns;
}

async function getPromoterPromotions(promoterId: string) {
  // Mock data for demo purposes - in production this would use actual database
  const mockPromotions = [
    {
      id: 'promotion-1',
      promoterId: promoterId,
      appliedAt: new Date('2024-01-15').toISOString(),
      campaign: {
        id: 'campaign-1',
        title: 'Summer Product Launch',
        creator: {
          id: 'creator-1',
          name: 'Fashion Brand Co',
        },
      },
    },
  ];

  return mockPromotions;
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

async function getPromoterApplications(promoterId: string) {
  // Mock data for demo purposes - in production this would use actual database
  const mockApplications = [
    {
      id: 'app-1',
      campaignId: 'campaign-1',
      promoterId: promoterId,
      status: 'APPROVED',
      appliedAt: new Date('2024-01-15').toISOString(),
      campaign: {
        id: 'campaign-1',
        title: 'Summer Product Launch',
        creator: {
          id: 'creator-1',
          name: 'Fashion Brand Co',
        },
      },
      creator: {
        id: 'creator-1',
        name: 'Fashion Brand Co',
      },
      views: 15000,
      earnings: 1500000,
    },
    {
      id: 'app-2',
      campaignId: 'campaign-2',
      promoterId: promoterId,
      status: 'PENDING',
      appliedAt: new Date('2024-02-01').toISOString(),
      campaign: {
        id: 'campaign-2',
        title: 'Winter Holiday Sale',
        creator: {
          id: 'creator-2',
          name: 'Tech Startup Inc',
        },
      },
      creator: {
        id: 'creator-2',
        name: 'Tech Startup Inc',
      },
      views: 0,
      earnings: 0,
    },
  ];

  return mockApplications;
}

export default async function PromoterCampaignsPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'promoter') {
    redirect('/auth/login');
  }

  const [availableCampaigns, myApplications] = await Promise.all([
    getAvailableCampaigns((session.user as any).id),
    getPromoterApplications((session.user as any).id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Campaign Discovery</h1>
        <p className="text-gray-600 mt-2">
          Find and apply to promotion campaigns
        </p>
      </div>

      {/* My Applications Summary */}
      {myApplications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Applications</CardTitle>
                <CardDescription>
                  Your recent campaign applications
                </CardDescription>
              </div>
              <Link href="/promoter/applications">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {myApplications.slice(0, 3).map(item => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm line-clamp-1">
                      {item.campaign.title}
                    </h4>
                    <Badge className={getApplicationStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    by {item.campaign.creator.name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Applied {new Date(item.appliedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Available Campaigns</CardTitle>
          <CardDescription>
            {availableCampaigns.length} campaigns available for application
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No campaigns available
              </h3>
              <p className="text-gray-600 mb-6">
                {myApplications.length > 0
                  ? "You've applied to all available campaigns. Check back later for new opportunities."
                  : 'No active campaigns are currently available. Check back later for new opportunities.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCampaigns.map(campaign => {
                const maxViews = Math.floor(
                  Number(campaign.budget) / Number(1000)
                );

                return (
                  <Card
                    key={campaign.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">
                            {campaign.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            by {campaign.creator.name ?? 'Unknown'}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor('active')}>
                          {'active'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Rate per View</p>
                          <p className="font-semibold text-green-600">
                            Rp {Number(1000).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Max Views</p>
                          <p className="font-semibold">
                            {maxViews.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-sm">
                        <p className="text-gray-600">Total Budget</p>
                        <p className="font-semibold text-blue-600">
                          Rp {Number(campaign.budget).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <Link
                          href={`/promoter/campaigns/${campaign.id}`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            className="w-full"
                            size="sm"
                          >
                            View Details
                          </Button>
                        </Link>
                        <Link
                          href={`/promoter/campaigns/${campaign.id}/apply`}
                          className="flex-1"
                        >
                          <Button className="w-full" size="sm">
                            Apply Now
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
