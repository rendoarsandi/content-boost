"use client";

import { useQuery } from '@repo/convex';
import { api } from '../../../convex/_generated/api';
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

interface User {
  id: string;
  role: string;
}

interface CampaignsListProps {
  user: User;
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

export function CampaignsList({ user }: CampaignsListProps) {
  // Use Convex hooks to fetch data in real-time
  const campaigns = useQuery(api.campaigns.getCampaignsByCreator, {
    creatorId: user.id,
  });

  if (campaigns === undefined) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No campaigns yet
            </h3>
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
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign._id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: any }) {
  // Get real-time stats for this campaign
  const stats = useQuery(api.campaigns.getCampaignStats, {
    campaignId: campaign._id,
  });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">
              {campaign.title}
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2">
              {campaign.description}
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
              ${campaign.budget.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Per View</p>
            <p className="font-semibold">
              ${campaign.paymentPerView.toLocaleString()}
            </p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Applications</p>
              <p className="font-semibold text-blue-600">
                {stats.totalApplications}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total Views</p>
              <p className="font-semibold text-green-600">
                {stats.totalViews.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Link href={`/creator/campaigns/${campaign._id}`} className="flex-1">
            <Button variant="outline" className="w-full" size="sm">
              View Details
            </Button>
          </Link>
          <Link href={`/creator/campaigns/${campaign._id}/edit`} className="flex-1">
            <Button className="w-full" size="sm">
              Edit
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}