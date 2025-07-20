import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { campaigns, campaignApplications, users } from '@repo/database';
import { eq, desc, and } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';

// GET /api/applications - List promoter's applications
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only promoters can view their applications
    // TODO: Implement role checking when user roles are properly configured
    // if (session.user.role !== 'promoter') {
    //   return NextResponse.json(
    //     { error: 'Forbidden - Only promoters can view applications' },
    //     { status: 403 }
    //   );
    // }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(campaignApplications.promoterId, (session.user as any).id)];
    
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      conditions.push(eq(campaignApplications.status, status as any));
    }

    // Get applications with campaign and creator details
    const applications = await db
      .select({
        application: campaignApplications,
        campaign: {
          id: campaigns.id,
          title: campaigns.title,
          description: campaigns.description,
          budget: campaigns.budget,
          ratePerView: campaigns.ratePerView,
          status: campaigns.status,
          startDate: campaigns.startDate,
          endDate: campaigns.endDate,
        },
        creator: {
          id: users.id,
          name: users.name,
        }
      })
      .from(campaignApplications)
      .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
      .innerJoin(users, eq(campaigns.creatorId, users.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(campaignApplications.appliedAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: campaignApplications.id })
      .from(campaignApplications)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    const totalCount = totalCountResult.length;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}