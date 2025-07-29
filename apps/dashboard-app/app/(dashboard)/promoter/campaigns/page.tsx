import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, users, campaignMaterials } from '@repo/database';
// import { eq, and, ne, notInArray, desc, isNull, or } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@repo/ui';
import Link from 'next/link';

async function getAvailableCampaigns(promoterId: string) {
  // Get campaigns that the promoter hasn't applied to yet
  const appliedCampaignIds = await db
    .select({ campaignId: campaignApplications.campaignId })
    .from(campaignApplications)
    .where(eq(campaignApplications.promoterId, promoterId));

  const appliedIds = appliedCampaignIds.map(app => app.campaignId);

  // Get available campaigns (active status, not applied by this promoter)
  const availableCampaigns = await db
    .select({
      campaign: campaigns,
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(campaigns)
    .innerJoin(users, eq(campaigns.creatorId, users.id))
    .where(
      and(
        eq(campaigns.status, 'active'),
        appliedIds.length > 0 ? notInArray(campaigns.id, appliedIds) : undefined
      )
    )
    .orderBy(desc(campaigns.createdAt));

  return availableCampaigns;
}

async function getPromoterApplications(promoterId: string) {
  const applications = await db
    .select({
      application: campaignApplications,
      campaign: campaigns,
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(campaignApplications)
    .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
    .innerJoin(users, eq(campaigns.creatorId, users.id))
    .where(eq(campaignApplications.promoterId, promoterId))
    .orderBy(desc(campaignApplications.appliedAt));

  return applications;
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
        <p className="text-gray-600 mt-2">Find and apply to promotion campaigns</p>
      </div>

      {/* My Applications Summary */}
      {myApplications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Applications</CardTitle>
                <CardDescription>Your recent campaign applications</CardDescription>
              </div>
              <Link href="/promoter/applications">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {myApplications.slice(0, 3).map(({ application, campaign, creator }) => (
                <div key={application.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm line-clamp-1">{campaign.title}</h4>
                    <Badge className={getApplicationStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">by {creator.name}</p>
                  <p className="text-xs text-gray-500">
                    Applied {new Date(application.appliedAt).toLocaleDateString()}
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns available</h3>
              <p className="text-gray-600 mb-6">
                {myApplications.length > 0 
                  ? "You've applied to all available campaigns. Check back later for new opportunities."
                  : "No active campaigns are currently available. Check back later for new opportunities."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCampaigns.map(({ campaign, creator }) => {
                const maxViews = Math.floor(Number(campaign.budget) / Number(campaign.ratePerView));
                
                return (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">
                            {campaign.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            by {creator.name}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {campaign.description && (
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {campaign.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Rate per View</p>
                          <p className="font-semibold text-green-600">
                            Rp {Number(campaign.ratePerView).toLocaleString()}
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

                      {campaign.requirements && Array.isArray(campaign.requirements) && campaign.requirements.length > 0 ? (
                        <div className="text-sm">
                          <p className="text-gray-600 mb-1">Requirements:</p>
                          <ul className="text-xs text-gray-500 space-y-1">
                            {(campaign.requirements as string[]).slice(0, 2).map((req, index) => (
                              <li key={index} className="flex items-start space-x-1">
                                <span className="text-green-500 mt-0.5">•</span>
                                <span className="line-clamp-1">{req}</span>
                              </li>
                            ))}
                            {campaign.requirements.length > 2 && (
                              <li className="text-gray-400">
                                +{campaign.requirements.length - 2} more requirements
                              </li>
                            )}
                          </ul>
                        </div>
                      ) : null}

                      <div className="flex space-x-2">
                        <Link href={`/promoter/campaigns/${campaign.id}`} className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/promoter/campaigns/${campaign.id}/apply`} className="flex-1">
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