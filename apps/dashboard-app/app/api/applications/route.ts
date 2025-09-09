import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@repo/auth/server-only';

// GET /api/applications - List promoter's applications
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only promoters can view their applications
    // TODO: Implement role checking when user roles are properly configured
    // if (session.user.role !== 'promoter') {
    //   return NextResponse.json(
    //     { error: 'Forbidden - Only promoters can view applications' },
    //     { status: 403 }
    //   );
    // }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get promotions (applications) for this promoter - Mock data
    const mockPromotions = [
      {
        id: 'promotion-1',
        promoterId: (session.user as any).id,
        campaignId: 'campaign-1',
        appliedAt: new Date('2024-01-15').toISOString(),
        status: 'APPROVED',
        campaign: {
          id: 'campaign-1',
          title: 'Summer Product Launch',
          description: 'Promote our new summer collection',
          creator: {
            id: 'creator-1',
            name: 'Fashion Brand Co',
          },
        },
      },
      {
        id: 'promotion-2',
        promoterId: (session.user as any).id,
        campaignId: 'campaign-2',
        appliedAt: new Date('2024-02-01').toISOString(),
        status: 'PENDING',
        campaign: {
          id: 'campaign-2',
          title: 'Winter Holiday Sale',
          description: 'Special holiday promotion campaign',
          creator: {
            id: 'creator-2',
            name: 'Tech Startup Inc',
          },
        },
      },
    ];

    // Apply pagination to mock data
    const startIndex = skip;
    const endIndex = skip + limit;
    const paginatedPromotions = mockPromotions.slice(startIndex, endIndex);

    // Mock total count
    const totalCount = mockPromotions.length;

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      promotions: paginatedPromotions,
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
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
