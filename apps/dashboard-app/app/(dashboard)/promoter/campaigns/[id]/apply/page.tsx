import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
import { campaigns, campaignMaterials, users, campaignApplications } from '@repo/database';
import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from '@repo/ui';
import Link from 'next/link';
import { CampaignApplicationForm } from '../../components/campaign-application-form';

async function getCampaignForApplication(campaignId: string, promoterId: string) {
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

  // Check if promoter has already applied
  const existingApplication = await db
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
    hasApplied: existingApplication.length > 0,
    application: existingApplication[0] || null,
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

export default async function CampaignApplicationPage({ params }: { params: { id: string } }) {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'promoter') {
    redirect('/auth/login');
  }

  const campaignData = await getCampaignForApplication(params.id, (session.user as any).id);

  if (!campaignData) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h1>
        <p className="text-gray-600 mb-6">The campaign you're trying to apply to doesn't exist or has been removed.</p>
        <Link href="/promoter/campaigns">
          <Button>Browse Other Campaigns</Button>
        </Link>
      </div>
    );
  }

  const { campaign, creator, hasApplied, application } = campaignData;

  if (campaign.status !== 'active') {
    return (
      <div className="space-y-8">
        <div>
          <Link href="/promoter/campaigns" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Campaigns
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Not Available</h1>
          <p className="text-gray-600 mt-2">{campaign.title}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaign Status: {campaign.status}</CardTitle>
                <CardDescription>by {creator.name}</CardDescription>
              </div>
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⏸️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Campaign Not Active</h3>
              <p className="text-gray-600 mb-6">
                This campaign is currently {campaign.status} and not accepting new applications.
              </p>
              <Link href="/promoter/campaigns">
                <Button>Browse Active Campaigns</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="space-y-8">
        <div>
          <Link href="/promoter/campaigns" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Campaigns
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Application Already Submitted</h1>
          <p className="text-gray-600 mt-2">{campaign.title}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Application Status</CardTitle>
            <CardDescription>
              Application submitted on {new Date(application!.appliedAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted</h3>
              <p className="text-gray-600 mb-6">
                You have already applied to this campaign. Your application is currently <strong>{application!.status}</strong>.
              </p>
              <div className="space-y-3">
                <Link href={`/promoter/campaigns/${campaign.id}`}>
                  <Button className="w-full">View Campaign Details</Button>
                </Link>
                <Link href="/promoter/applications">
                  <Button variant="outline" className="w-full">View All Applications</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxViews = Math.floor(Number(campaign.budget) / Number(campaign.ratePerView));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/promoter/campaigns" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
          ← Back to Campaigns
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Apply to Campaign</h1>
        <p className="text-gray-600 mt-2">{campaign.title} by {creator.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Application Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Application</CardTitle>
              <CardDescription>
                Apply to join this campaign and start earning from your promotions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignApplicationForm campaignId={campaign.id} />
            </CardContent>
          </Card>
        </div>

        {/* Campaign Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
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

              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {campaign.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {campaign.description}
                </p>
              </CardContent>
            </Card>
          )}

          {campaign.requirements && Array.isArray(campaign.requirements) && campaign.requirements.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(campaign.requirements as string[]).map((requirement, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

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
        </div>
      </div>
    </div>
  );
}