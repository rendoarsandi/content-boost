import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { getSession } from '@repo/auth/server-only';

// Validation schemas
const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  budget: z.number().positive('Budget must be positive'),
  requirements: z.array(z.string()).default([]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const UpdateCampaignSchema = CreateCampaignSchema.partial();

// GET /api/campaigns - List campaigns for authenticated creator
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can view their campaigns
    if ((session.user as any).role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can access campaigns' },
        { status: 403 }
      );
    }

    const userCampaigns = await db.campaign.findMany({
      where: {
        creatorId: (session.user as any).id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ campaigns: userCampaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can create campaigns
    if ((session.user as any).role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can create campaigns' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = CreateCampaignSchema.parse(body);

    // Create campaign
    const newCampaign = await db.campaign.create({
      data: {
        creatorId: (session.user as any).id,
        name: validatedData.name,
        budget: validatedData.budget,
      }
    });

    return NextResponse.json(
      { 
        campaign: newCampaign,
        message: 'Campaign created successfully'
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

    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}