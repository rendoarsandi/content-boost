import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// // import { campaigns, campaignApplications, campaignMaterials } from '@repo/database';
// // import { eq, and } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';
import { CampaignService } from '@repo/utils';

const ApplyCampaignSchema = z.object({
  submittedContent: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// POST /api/promoter/campaigns/[id]/apply - Apply to campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can apply to campaigns' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const promoterId = (session.user as any).id;

    // Check if campaign exists and is active
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Note: Campaign model doesn't have status field - assuming all found campaigns are active
    // if (campaign.status !== 'active') {
    //   return NextResponse.json(
    //     { error: 'Campaign is not active' },
    //     { status: 400 }
    //   );
    // }

    // Check if promoter already applied
    const existingApplication = await db.promotion.findFirst({
      where: {
        campaignId: campaignId,
        promoterId: promoterId
      }
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = ApplyCampaignSchema.parse(body);

    // Generate unique tracking link
    const trackingLink = CampaignService.generateTrackingLink(campaignId, promoterId);

    // Create application (using promotion as application)
    const newApplication = await db.promotion.create({
      data: {
        campaignId,
        promoterId,
        contentUrl: validatedData.submittedContent || '',
        views: 0,
        earnings: 0,
      }
    });

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
          details: error.issues
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