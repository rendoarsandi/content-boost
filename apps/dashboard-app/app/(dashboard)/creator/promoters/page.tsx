import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { db } from '@repo/database';
import { campaignApplications, campaigns, users } from '@repo/database';
import { eq, and, desc } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@repo/ui';
import Link from 'next/link';
import { PromoterApplicationActions } from '../components/promoter-application-actions';

async function getPromoterApplications(creatorId: string) {
  const applications = await db
    .select({
      application: campaignApplications,
      campaign: {
        id: campaigns.id,
        title: campaigns.title,
        status: campaigns.status,
      },
      promoter: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(campaignApplications)
    .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
    .innerJoin(users, eq(campaignApplications.promoterId, users.id))
    .where(eq(campaigns.creatorId, creatorId))
    .orderBy(desc(campaignApplications.appliedAt));

  return applications;
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

export default async function PromotersPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  const applications = await getPromoterApplications((session.user as any).id);

  const pendingApplications = applications.filter(app => app.application.status === 'pending');
  const approvedApplications = applications.filter(app => app.application.status === 'approved');
  const rejectedApplications = applications.filter(app => app.application.status === 'rejected');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promoter Management</h1>
          <p className="text-gray-600 mt-2">Review and manage promoter applications</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvedApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active promoters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rejectedApplications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Declined applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {applications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⏳</span>
              <span>Pending Applications ({pendingApplications.length})</span>
            </CardTitle>
            <CardDescription>
              Applications waiting for your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApplications.map(({ application, campaign, promoter }) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {promoter.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{promoter.name}</h3>
                          <p className="text-sm text-gray-600">{promoter.email}</p>
                        </div>
                      </div>
                      
                      <div className="ml-13">
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Campaign:</strong> {campaign.title}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Applied:</strong> {new Date(application.appliedAt).toLocaleDateString()}
                        </p>
                        
                        {application.submittedContent && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">Submitted Content:</p>
                            <p className="text-sm text-gray-600">{application.submittedContent}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      <Badge className={getApplicationStatusColor(application.status)}>
                        {application.status}
                      </Badge>
                      <PromoterApplicationActions 
                        applicationId={application.id}
                        currentStatus={application.status}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Applications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Applications</CardTitle>
              <CardDescription>
                Complete history of promoter applications
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Link href="/creator/promoters/approved">
                <Button variant="outline">View Approved</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 mb-6">
                Applications will appear here once promoters apply to your campaigns
              </p>
              <Link href="/creator/campaigns">
                <Button>View Your Campaigns</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(({ application, campaign, promoter }) => (
                <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {promoter.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{promoter.name}</p>
                      <p className="text-sm text-gray-600">{campaign.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getApplicationStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(application.appliedAt).toLocaleDateString()}
                    </span>
                    <Link href={`/creator/applications/${application.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
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