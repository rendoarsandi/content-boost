import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { getSession } from '@repo/auth/server-only';

const CreateApplicationSchema = z.object({
  campaignId: z.string().cuid('Invalid campaign ID'),
  contentUrl: z.string().url('Invalid content URL'),
});

// POST /api/applications/[id] - Apply to a campaign
export async function POST(
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

    // Only promoters can apply to campaigns
    if ((session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Forbidden - Only promoters can apply to campaigns' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = CreateApplicationSchema.parse({ 
      ...body, 
      campaignId 
    });

    // Check if campaign exists
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if user already has a promotion for this campaign
    const existingPromotion = await db.promotion.findFirst({
      where: {
        campaignId,
        promoterId: (session.user as any).id
      }
    });

    if (existingPromotion) {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 400 }
      );
    }

    // Create promotion (application)
    const newPromotion = await db.promotion.create({
      data: {
        campaignId,
        promoterId: (session.user as any).id,
        contentUrl: validatedData.contentUrl,
        views: 0,
        earnings: 0,
      }
    });

    return NextResponse.json(
      { 
        promotion: newPromotion,
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

    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/applications/[id] - Get application details
export async function GET(
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

    const { id: applicationId } = await params;

    // Get promotion with campaign details
    const promotion = await db.promotion.findUnique({
      where: { id: applicationId },
      include: {
        campaign: {
          include: {
            creator: true
          }
        },
        promoter: true
      }
    });

    if (!promotion) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user owns this promotion or is the campaign creator
    const isOwner = promotion.promoterId === (session.user as any).id;
    const isCreator = promotion.campaign.creatorId === (session.user as any).id;

    if (!isOwner && !isCreator) {
      return NextResponse.json(
        { error: 'Forbidden - You can only view your own applications' },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      promotion,
      campaign: promotion.campaign
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}