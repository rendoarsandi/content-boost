import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// // import { campaigns, campaignApplications, campaignMaterials } from '@repo/database';
// // import { eq, and } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';
import { generateTrackingLink } from '@repo/utils';

const ApplyCampaignSchema = z.object({
  submittedContent: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// POST /api/promoter/campaigns/[id]/apply - Apply to campaign
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can apply to campaigns' },
        { status: 401 }
      );
    }

    const campaignId = params.id;
    const promoterId = (session.user as any).id;

    // Check if campaign exists and is active
    const campaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign.length) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign[0].status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      );
    }

    // Check if promoter already applied
    const existingApplication = await db
      .select()
      .from(campaignApplications)
      .where(
        and(
          eq(campaignApplications.campaignId, campaignId),
          eq(campaignApplications.promoterId, promoterId)
        )
      )
      .limit(1);

    if (existingApplication.length > 0) {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = ApplyCampaignSchema.parse(body);

    // Generate unique tracking link
    const trackingLink = generateTrackingLink(campaignId, promoterId);

    // Create application
    const [newApplication] = await db
      .insert(campaignApplications)
      .values({
        campaignId,
        promoterId,
        submittedContent: validatedData.submittedContent,
        trackingLink,
        metadata: validatedData.metadata,
        status: 'pending',
      })
      .returning();

    return NextResponse.json(
      { 
        application: newApplication,
        message: 'Application submitted successfully'
      },
      { status: 201 }
    );
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

    console.error('Error applying to campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}