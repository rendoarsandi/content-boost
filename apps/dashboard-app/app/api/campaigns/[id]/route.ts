import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// import { campaigns, campaignMaterials } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';

const UpdateCampaignSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  budget: z.number().positive().optional(),
  ratePerView: z.number().positive().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  requirements: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// GET /api/campaigns/[id] - Get specific campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    // Get campaign with materials
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if user owns this campaign (creators only) or is admin
    if (session.user.role === 'creator' && campaign.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own campaigns' },
        { status: 403 }
      );
    }

    // Get campaign materials
    const materials = await db
      .select()
      .from(campaignMaterials)
      .where(eq(campaignMaterials.campaignId, campaignId));

    return NextResponse.json({
      campaign: {
        ...campaign,
        materials
      }
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can update campaigns
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can update campaigns' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = UpdateCampaignSchema.parse(body);

    // Check if campaign exists and user owns it
    const [existingCampaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.creatorId, session.user.id)
        )
      );

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Validate budget vs rate if both are being updated
    if (validatedData.budget && validatedData.ratePerView) {
      const maxViews = Math.floor(validatedData.budget / validatedData.ratePerView);
      if (maxViews < 1) {
        return NextResponse.json(
          { error: 'Budget too low for the specified rate per view' },
          { status: 400 }
        );
      }
    }

    // Validate status transitions
    if (validatedData.status) {
      const validTransitions: Record<string, string[]> = {
        'draft': ['active'],
        'active': ['paused', 'completed'],
        'paused': ['active', 'completed'],
        'completed': [] // Cannot transition from completed
      };

      const allowedTransitions = validTransitions[existingCampaign.status];
      if (!allowedTransitions.includes(validatedData.status)) {
        return NextResponse.json(
          { 
            error: `Invalid status transition from ${existingCampaign.status} to ${validatedData.status}` 
          },
          { status: 400 }
        );
      }
    }

    // Update campaign
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date(),
    };

    // Convert string dates to Date objects
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate);
    }
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate);
    }

    // Convert numbers to strings for decimal fields
    if (validatedData.budget) {
      updateData.budget = validatedData.budget.toString();
    }
    if (validatedData.ratePerView) {
      updateData.ratePerView = validatedData.ratePerView.toString();
    }

    const [updatedCampaign] = await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, campaignId))
      .returning();

    return NextResponse.json({
      campaign: updatedCampaign,
      message: 'Campaign updated successfully'
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

    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can delete campaigns
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can delete campaigns' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;

    // Check if campaign exists and user owns it
    const [existingCampaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.creatorId, session.user.id)
        )
      );

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Only allow deletion of draft campaigns
    if (existingCampaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft campaigns can be deleted' },
        { status: 400 }
      );
    }

    // Delete campaign (materials will be deleted via cascade)
    await db
      .delete(campaigns)
      .where(eq(campaigns.id, campaignId));

    return NextResponse.json({
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}