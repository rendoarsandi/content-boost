import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { campaigns } from '@repo/database';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';

const UpdateStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'completed'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be active, paused, or completed',
  }),
});

// PATCH /api/campaigns/[id]/status - Update campaign status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can update campaign status
    if ((session.user as any).role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can update campaign status' },
        { status: 403 }
      );
    }

    const campaignId = params.id;
    const body = await request.json();
    const validatedData = UpdateStatusSchema.parse(body);

    // Verify campaign ownership
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, (session.user as any).id)));

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    const currentStatus = campaign.status;
    const newStatus = validatedData.status;

    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['active'],
      active: ['paused', 'completed'],
      paused: ['active', 'completed'],
      completed: [], // Cannot transition from completed
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${newStatus}` },
        { status: 400 }
      );
    }

    // Update campaign status
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId))
      .returning();

    return NextResponse.json({
      campaign: updatedCampaign,
      message: `Campaign status updated to ${newStatus}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('Error updating campaign status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}