import { getSession } from '@repo/auth/server-only';
import { redirect, notFound } from 'next/navigation';
import { db } from '@repo/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@repo/ui';
import Link from 'next/link';
import { CampaignStatusActions } from '../../components/campaign-status-actions';
import { RealTimeMetrics } from '../../components/real-time-metrics';

async function getCampaignDetails(campaignId: string, creatorId: string) {
  // Get campaign with promotions
  const campaign = await db.campaign.findFirst({
    where: {
      id: campaignId,
      creatorId
    },
    include: {
      promotions: {
        include: {
          promoter: true
        }
      },
      _count: {
        select: {
          promotions: true
        }
      }
    }
  });

  if (!campaign) {
    return null;
  }

  // Calculate statistics from promotions
  const totalViews = campaign.promotions.reduce((sum, p) => sum + p.views, 0);
  const totalEarnings = campaign.promotions.reduce((sum, p) => sum + p.earnings, 0);

  // Create applications from promotions
  const applications = campaign.promotions.map(promotion => ({
    application: { ...promotion, status: 'approved' },
    promoter: promotion.promoter,
  }));

  // For now, materials is empty (can be implemented later if needed)
  const materials: any[] = [];

  return {
    campaign,
    materials,
    applications,
    stats: {
      totalViews,
      legitimateViews: totalViews, // Same as total for now
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
  const campaignDetails = await getCampaignDetails(id, (session.user as any).id);

  if (!campaignDetails) {
    notFound();
  }

  const { campaign, materials, applications, stats } = campaignDetails;

  const approvedApplications = applications.filter(app => app.application.status === 'approved');
  const pendingApplications = applications.filter(app => app.application.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
          </div>
          <p className="text-gray-600">Campaign Budget: Rp {campaign.budget.toLocaleString()}</p>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <Link href={`/creator/campaigns/${campaign.id}/edit`}>
              <Button variant="outline">Edit Campaign</Button>
            </Link>
            <Link href={`/creator/campaigns/${campaign.id}/applications`}>
              <Button variant="outline">Manage Applications</Button>
            </Link>
          </div>
          <CampaignStatusActions 
            campaignId={campaign.id}
            currentStatus="active"
          />
        </div>
      </div>

      {/* Real-Time Metrics */}
      <RealTimeMetrics 
        campaignId={campaign.id}
        initialData={{
          totalViews: stats.totalViews,
          legitimateViews: stats.legitimateViews,
          botViews: stats.totalViews - stats.legitimateViews,
          activePromoters: approvedApplications.length,
          estimatedSpent: stats.legitimateViews * 100, // Default rate of 100 per view
          lastUpdated: new Date().toISOString(),
        }}
      />

      {/* Campaign Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              Rp {Number(campaign.budget).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rate per View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp 100
            </div>
            <p className="text-xs text-gray-500 mt-1">Per legitimate view</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Budget Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {((stats.legitimateViews * 100 / Number(campaign.budget)) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Of total budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Promoters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {approvedApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Approved promoters</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Campaign Materials */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Materials</CardTitle>
            <CardDescription>Resources provided to promoters</CardDescription>
          </CardHeader>
          <CardContent>
            {materials.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No materials uploaded</p>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <div key={material.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{material.title}</h4>
                        <p className="text-sm text-gray-600 capitalize">{material.type}</p>
                        {material.description && (
                          <p className="text-sm text-gray-500 mt-1">{material.description}</p>
                        )}
                      </div>
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
            <CardDescription>Criteria for promoter applications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-4">No specific requirements</p>
          </CardContent>
        </Card>
      </div>

      {/* Promoter Applications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Promoter Applications</CardTitle>
              <CardDescription>
                {applications.length} total applications
                {pendingApplications.length > 0 && (
                  <span className="ml-2 text-yellow-600">
                    • {pendingApplications.length} pending review
                  </span>
                )}
              </CardDescription>
            </div>
            <Link href={`/creator/campaigns/${campaign.id}/applications`}>
              <Button variant="outline">Manage Applications</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No applications yet</p>
              <p className="text-sm mt-2">Applications will appear here once promoters apply</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 5).map(({ application, promoter }) => (
                <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {(promoter.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{promoter.name || 'Unknown User'}</p>
                      <p className="text-sm text-gray-600">{promoter.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getApplicationStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(application.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {applications.length > 5 && (
                <div className="text-center pt-4">
                  <Link href={`/creator/campaigns/${campaign.id}/applications`}>
                    <Button variant="outline">
                      View All {applications.length} Applications
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}