import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { campaigns, campaignMaterials } from '@repo/database/schemas';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';

// Validation schemas
const CreateCampaignSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  budget: z.number().positive('Budget must be positive'),
  ratePerView: z.number().positive('Rate per view must be positive'),
  requirements: z.array(z.string()).default([]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  materials: z.array(z.object({
    type: z.enum(['google_drive', 'youtube', 'image', 'video']),
    url: z.string().url('Invalid URL'),
    title: z.string().min(1, 'Material title is required'),
    description: z.string().optional(),
  })).default([]),
});

const UpdateCampaignSchema = CreateCampaignSchema.partial().extend({
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
});

// GET /api/campaigns - List campaigns for authenticated creator
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can view their campaigns
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can access campaigns' },
        { status: 403 }
      );
    }

    const userCampaigns = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.creatorId, session.user.id))
      .orderBy(desc(campaigns.createdAt));

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
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can create campaigns
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can create campaigns' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = CreateCampaignSchema.parse(body);

    // Validate budget vs rate calculation
    const maxViews = Math.floor(validatedData.budget / validatedData.ratePerView);
    if (maxViews < 1) {
      return NextResponse.json(
        { error: 'Budget too low for the specified rate per view' },
        { status: 400 }
      );
    }

    // Create campaign
    const [newCampaign] = await db
      .insert(campaigns)
      .values({
        creatorId: session.user.id,
        title: validatedData.title,
        description: validatedData.description,
        budget: validatedData.budget.toString(),
        ratePerView: validatedData.ratePerView.toString(),
        requirements: validatedData.requirements,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        status: 'draft',
        updatedAt: new Date(),
      })
      .returning();

    // Create campaign materials if provided
    if (validatedData.materials.length > 0) {
      await db
        .insert(campaignMaterials)
        .values(
          validatedData.materials.map(material => ({
            campaignId: newCampaign.id,
            type: material.type,
            url: material.url,
            title: material.title,
            description: material.description,
          }))
        );
    }

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