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

async function getPromoterPromotions(creatorId: string) {
  // Mock data for demo purposes - in production this would use actual database
  const mockPromotions = [
    {
      id: 'promotion-1',
      appliedAt: new Date('2024-01-15').toISOString(),
      campaign: {
        id: 'campaign-1',
        title: 'Summer Product Launch',
        creatorId: creatorId,
      },
      promoter: {
        id: 'promoter-1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    {
      id: 'promotion-2',
      appliedAt: new Date('2024-01-20').toISOString(),
      campaign: {
        id: 'campaign-1',
        title: 'Summer Product Launch',
        creatorId: creatorId,
      },
      promoter: {
        id: 'promoter-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
      },
    },
    {
      id: 'promotion-3',
      appliedAt: new Date('2024-02-05').toISOString(),
      campaign: {
        id: 'campaign-2',
        title: 'Winter Holiday Sale',
        creatorId: creatorId,
      },
      promoter: {
        id: 'promoter-3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
      },
    },
  ];

  return mockPromotions;
}

function getStatusColor() {
  // Since we don't have status in Prisma schema, default to active
  return 'bg-green-100 text-green-800';
}

export default async function PromotersPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  const promotions = await getPromoterPromotions((session.user as any).id);

  // Since we don't have status field, all promotions are considered approved
  const approvedPromotions = promotions;
  const pendingPromotions: any[] = [];
  const rejectedPromotions: any[] = [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Promoter Management
          </h1>
          <p className="text-gray-600 mt-2">
            Review and manage promoter applications
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingPromotions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvedPromotions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active promoters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rejectedPromotions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Declined applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {promotions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Applications */}
      {pendingPromotions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⏳</span>
              <span>Pending Applications ({pendingPromotions.length})</span>
            </CardTitle>
            <CardDescription>
              Applications waiting for your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>No pending applications at this time.</p>
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
          {promotions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No applications yet
              </h3>
              <p className="text-gray-600 mb-6">
                Applications will appear here once promoters apply to your
                campaigns
              </p>
              <Link href="/creator/campaigns">
                <Button>View Your Campaigns</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map(promotion => (
                <div
                  key={promotion.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {(promotion.promoter.name || 'U')
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {promotion.promoter.name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {promotion.campaign.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor()}>Active</Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(promotion.appliedAt).toLocaleDateString()}
                    </span>
                    <Link href={`/creator/promotions/${promotion.id}`}>
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
