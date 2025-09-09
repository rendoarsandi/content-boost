import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@repo/auth/server-only';

// GET /api/campaigns/available - List available campaigns for promoters to apply
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only promoters can view available campaigns
    if ((session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Forbidden - Only promoters can view available campaigns' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // TODO: Replace with actual Convex calls once fully migrated
    // For now, return mock data to ensure the build works
    const mockCampaigns = [
      {
        _id: 'campaign-1',
        title: 'Summer Product Launch',
        description: 'Promote our new summer collection',
        budget: 5000000,
        paymentPerView: 1000,
        status: 'active',
        createdAt: Date.now(),
        creatorId: 'creator-1',
      },
      {
        _id: 'campaign-2',
        title: 'Winter Holiday Sale',
        description: 'Special holiday promotion campaign',
        budget: 3000000,
        paymentPerView: 800,
        status: 'active',
        createdAt: Date.now(),
        creatorId: 'creator-2',
      },
    ];

    const availableCampaigns = mockCampaigns.slice(skip, skip + limit);
    const totalCount = mockCampaigns.length;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      campaigns: availableCampaigns,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching available campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}