import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
import { campaigns, campaignApplications } from '@repo/database';
import { eq, count, desc } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@repo/ui';
import Link from 'next/link';

async function getCreatorCampaigns(creatorId: string) {
  const campaignsWithStats = await db
    .select({
      campaign: campaigns,
      applicationCount: count(campaignApplications.id),
    })
    .from(campaigns)
    .leftJoin(campaignApplications, eq(campaigns.id, campaignApplications.campaignId))
    .where(eq(campaigns.creatorId, creatorId))
    .groupBy(campaigns.id)
    .orderBy(desc(campaigns.createdAt));

  return campaignsWithStats;
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

export default async function CampaignsPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  const campaignsWithStats = await getCreatorCampaigns((session.user as any).id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Campaigns</h1>
          <p className="text-gray-600 mt-2">Manage your promotion campaigns</p>
        </div>
        <Link href="/creator/campaigns/new">
          <Button>Create New Campaign</Button>
        </Link>
      </div>

      {campaignsWithStats.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first campaign to start promoting your content
            </p>
            <Link href="/creator/campaigns/new">
              <Button>Create Your First Campaign</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaignsWithStats.map(({ campaign, applicationCount }) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {campaign.title}
                    </CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">
                      {campaign.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Budget</p>
                    <p className="font-semibold">
                      Rp {Number(campaign.budget).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Rate/View</p>
                    <p className="font-semibold">
                      Rp {Number(campaign.ratePerView).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Applications</span>
                  <span className="font-semibold text-blue-600">
                    {applicationCount} promoters
                  </span>
                </div>

                <div className="flex space-x-2">
                  <Link href={`/creator/campaigns/${campaign.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/creator/campaigns/${campaign.id}/edit`} className="flex-1">
                    <Button className="w-full" size="sm">
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}