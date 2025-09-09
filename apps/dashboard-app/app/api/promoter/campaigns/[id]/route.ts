import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@repo/auth/server-only';

// GET /api/promoter/campaigns/[id] - Get campaign details for promoters
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can view campaign details' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    // Mock campaign data for demo purposes
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: 'Summer Product Launch',
        budget: 5000000,
        description: 'Promote our new summer collection',
        creator: {
          id: 'creator-1',
          name: 'Fashion Brand Co.',
          email: 'creator@fashionbrand.com',
        },
      },
      {
        id: 'campaign-2',
        title: 'Winter Holiday Sale',
        budget: 3000000,
        description: 'Special holiday promotion campaign',
        creator: {
          id: 'creator-2',
          name: 'Tech Gadgets Inc.',
          email: 'creator@techgadgets.com',
        },
      },
    ];

    const campaign = mockCampaigns.find(c => c.id === campaignId);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Mock campaign materials
    const mockMaterials = [
      {
        id: 'material-1',
        campaignId: 'campaign-1',
        type: 'image',
        url: 'https://example.com/campaign-banner.jpg',
        title: 'Campaign Banner',
      },
      {
        id: 'material-2',
        campaignId: 'campaign-1',
        type: 'video',
        url: 'https://example.com/product-demo.mp4',
        title: 'Product Demo Video',
      },
      {
        id: 'material-3',
        campaignId: 'campaign-2',
        type: 'google_drive',
        url: 'https://drive.google.com/file/d/example',
        title: 'Brand Guidelines',
      },
    ];

    const materials = mockMaterials.filter(m => m.campaignId === campaignId);

    // Mock existing application check
    const mockApplications = [
      {
        campaignId: 'campaign-1',
        promoterId: 'promoter-1',
      },
    ];

    const application = mockApplications.find(
      app => app.campaignId === campaignId && app.promoterId === (session.user as any).id
    );

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        budget: campaign.budget,
        creator: campaign.creator,
      },
      materials,
      application,
      canApply: !application,
    });
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}