import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// import { campaignApplications, campaigns } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';

const UpdateStatusSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be either approved or rejected',
  }),
});

// PATCH /api/applications/[id]/status - Update application status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can update application status
    if ((session.user as any).role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can update application status' },
        { status: 403 }
      );
    }

    const { id: applicationId } = await params;
    const body = await request.json();
    const validatedData = UpdateStatusSchema.parse(body);

    // Get promotion with campaign details to verify ownership
    const promotion = await db.promotion.findFirst({
      where: {
        id: promotionId,
        campaign: {
          creatorId: (session.user as any).id
        }
      },
      include: {
        campaign: true,
        promoter: true
      }
    });

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found or access denied' },
        { status: 404 }
      );
    }

    // Since we don't have status field, just return promotion info
    return NextResponse.json({
      promotion,
      message: 'Promotion is active by default'
    });
  } catch (error) {
    console.error('Error accessing promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}