import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
// import { campaigns, campaignMaterials, users, campaignApplications } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@repo/ui';
import Link from 'next/link';
import { CampaignApplicationForm } from '../../components/campaign-application-form';

async function getCampaignDetails(campaignId: string, promoterId: string) {
  // Get campaign with creator info
  const campaignData = await db
    .select({
      campaign: campaigns,
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(campaigns)
    .innerJoin(users, eq(campaigns.creatorId, users.id))
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaignData.length) {
    return null;
  }

  // Get campaign materials
  const materials = await db
    .select()
    .from(campaignMaterials)
    .where(eq(campaignMaterials.campaignId, campaignId));

  // Check if promoter has applied
  const application = await db
    .select()
    .from(campaignApplications)
    .where(
      and(
        eq(campaignApplications.campaignId, campaignId),
        eq(campaignApplications.promoterId, promoterId)
      )
    )
    .limit(1);

  const { campaign, creator } = campaignData[0];

  return {
    campaign,
    creator,
    materials,
    application: application[0] || null,
    hasApplied: application.length > 0,
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

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'promoter') {
    redirect('/auth/login');
  }

  const { id } = await params;
  const campaignDetails = await getCampaignDetails(id, (session.user as any).id);

  if (!campaignDetails) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h1>
        <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
        <Link href="/promoter/campaigns">
          <Button>Browse Other Campaigns</Button>
        </Link>
      </div>
    );
  }

  const { campaign, creator, materials, application, hasApplied } = campaignDetails;
  const maxViews = Math.floor(Number(campaign.budget) / Number(campaign.ratePerView));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/promoter/campaigns" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Campaigns
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
          <p className="text-gray-600 mt-2">by {creator.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status}
          </Badge>
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
              {campaign.description ? (
                <p className="text-gray-700 whitespace-pre-wrap">{campaign.description}</p>
              ) : (
                <p className="text-gray-500 italic">No description provided</p>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          {campaign.requirements && Array.isArray(campaign.requirements) && campaign.requirements.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
                <CardDescription>Please ensure you meet these requirements before applying</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(campaign.requirements as string[]).map((requirement, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* Campaign Materials */}
          {materials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign Materials</CardTitle>
                <CardDescription>
                  {application?.status === 'approved' 
                    ? 'Download and use these materials for your promotion'
                    : 'Materials will be available after your application is approved'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {application?.status === 'approved' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materials.map((material) => (
                      <div key={material.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{material.title}</h4>
                          <Badge variant="outline">{material.type}</Badge>
                        </div>
                        {material.description && (
                          <p className="text-sm text-gray-600 mb-3">{material.description}</p>
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
                    <p>Materials are locked until your application is approved</p>
                    <p className="text-sm mt-2">{materials.length} materials available</p>
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
                  Application submitted on {new Date(application!.appliedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Status</span>
                  <Badge className={getApplicationStatusColor(application!.status)}>
                    {application!.status}
                  </Badge>
                </div>

                {application!.submittedContent && (
                  <div>
                    <h4 className="font-medium mb-2">Submitted Content</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {application!.submittedContent}
                      </p>
                    </div>
                  </div>
                )}

                {application!.trackingLink && (
                  <div>
                    <h4 className="font-medium mb-2">Tracking Link</h4>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <code className="text-sm text-blue-800">{application!.trackingLink}</code>
                    </div>
                  </div>
                )}

                {application!.status === 'approved' && (
                  <div className="flex space-x-3">
                    <Link href={`/promoter/applications/${application!.id}/content`}>
                      <Button>Edit Content</Button>
                    </Link>
                    <Link href={`/promoter/analytics?campaignId=${campaign.id}`}>
                      <Button variant="outline">View Analytics</Button>
                    </Link>
                  </div>
                )}

                {application!.reviewedAt && (
                  <p className="text-xs text-gray-500">
                    Reviewed on {new Date(application!.reviewedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            campaign.status === 'active' && (
              <Card>
                <CardHeader>
                  <CardTitle>Apply to Campaign</CardTitle>
                  <CardDescription>Submit your application to join this campaign</CardDescription>
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
                  Rp {Number(campaign.ratePerView).toLocaleString()}
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

              {campaign.endDate && (
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="font-medium">
                    {new Date(campaign.endDate).toLocaleDateString()}
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
                    {creator.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{creator.name}</p>
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
              {application?.status === 'approved' && (
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