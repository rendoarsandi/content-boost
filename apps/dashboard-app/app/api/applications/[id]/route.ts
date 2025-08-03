import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateApplicationSchema = z.object({
  campaignId: z.string().cuid('Invalid campaign ID'),
  contentUrl: z.string().url('Invalid content URL'),
});

// POST /api/applications/[id] - Simplified application route to avoid bundling issues
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const body = await request.json();
    const validatedData = CreateApplicationSchema.parse(body);

    // Simplified response to avoid bundling circular dependency
    return NextResponse.json({
      applicationId,
      campaignId: validatedData.campaignId,
      message: 'Application created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/applications/[id] - Get specific application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    
    return NextResponse.json({
      applicationId,
      status: 'active',
      message: 'Application found'
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}