import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
// import { campaignApplications, campaigns, campaignMaterials } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@repo/ui';
import Link from 'next/link';
import { ContentEditor } from '../../../../../components/content-editor';

async function getApplicationContent(applicationId: string, promoterId: string) {
  // Get application with campaign info
  const applicationData = await db
    .select({
      application: campaignApplications,
      campaign: campaigns,
    })
    .from(campaignApplications)
    .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
    .where(
      and(
        eq(campaignApplications.id, applicationId),
        eq(campaignApplications.promoterId, promoterId)
      )
    )
    .limit(1);

  if (!applicationData.length) {
    return null;
  }

  const { application, campaign } = applicationData[0];

  // Only approved applications can access materials
  if (application.status !== 'approved') {
    return { application, campaign, materials: [], canEdit: false };
  }

  // Get campaign materials
  const materials = await db
    .select()
    .from(campaignMaterials)
    .where(eq(campaignMaterials.campaignId, campaign.id));

  return {
    application,
    campaign,
    materials,
    canEdit: true,
  };
}

export default async function ContentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'promoter') {
    redirect('/auth/login');
  }

  const { id } = await params;
  const contentData = await getApplicationContent(id, (session.user as any).id);

  if (!contentData) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Not Found</h1>
        <p className="text-gray-600 mb-6">The application you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/promoter/applications">
          <Button>Back to Applications</Button>
        </Link>
      </div>
    );
  }

  const { application, campaign, materials, canEdit } = contentData;

  if (!canEdit) {
    return (
      <div className="space-y-8">
        <div>
          <Link href="/promoter/applications" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Applications
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Content Access Restricted</h1>
          <p className="text-gray-600 mt-2">Campaign: {campaign.title}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Application Not Approved</CardTitle>
            <CardDescription>
              Your application status: <span className="font-semibold capitalize">{application.status}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Content Access Pending</h3>
              <p className="text-gray-600 mb-6">
                You can only edit content and access materials after your application is approved by the creator.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Applied on: {new Date(application.appliedAt).toLocaleDateString()}
                </p>
                {application.reviewedAt && (
                  <p className="text-sm text-gray-500">
                    Reviewed on: {new Date(application.reviewedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/promoter/applications" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
          ← Back to Applications
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Content</h1>
        <p className="text-gray-600 mt-2">Campaign: {campaign.title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Content Editor</CardTitle>
              <CardDescription>
                Edit your promotional content for this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentEditor 
                applicationId={application.id}
                initialContent={application.submittedContent || ''}
                initialMetadata={application.metadata as Record<string, any> || {}}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campaign Materials */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Materials</CardTitle>
              <CardDescription>
                Use these materials in your promotion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <p className="text-gray-500 text-sm">No materials available</p>
              ) : (
                <div className="space-y-3">
                  {materials.map((material) => (
                    <div key={material.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{material.title}</h4>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {material.type}
                        </span>
                      </div>
                      {material.description && (
                        <p className="text-xs text-gray-600 mb-2">{material.description}</p>
                      )}
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Open Material →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Rate per View</p>
                <p className="font-semibold text-green-600">
                  Rp {Number(campaign.ratePerView).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="font-semibold text-blue-600">
                  Rp {Number(campaign.budget).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tracking Link</p>
                <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">
                  {application.trackingLink}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          {campaign.requirements && Array.isArray(campaign.requirements) && campaign.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {(campaign.requirements as string[]).map((requirement, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}