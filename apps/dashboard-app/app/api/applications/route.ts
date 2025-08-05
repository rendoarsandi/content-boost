import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
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

    // Get promotions (applications) for this promoter
    const promotions = await db.campaignApplication.findMany({
      where: {
        promoterId: (session.user as any).id,
      },
      include: {
        campaign: {
          include: {
            creator: true,
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await db.campaignApplication.count({
      where: {
        promoterId: (session.user as any).id,
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      promotions,
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
