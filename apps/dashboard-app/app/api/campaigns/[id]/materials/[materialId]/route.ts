import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateMaterialSchema = z.object({
  type: z.enum(['GOOGLE_DRIVE', 'YOUTUBE', 'IMAGE', 'VIDEO']).optional(),
  url: z.string().url('Invalid URL').optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// GET /api/campaigns/[id]/materials/[materialId] - Simplified material route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { id: campaignId, materialId } = await params;

    return NextResponse.json({
      materialId,
      campaignId,
      type: 'IMAGE',
      title: 'Sample Material',
      url: 'https://example.com/sample.jpg',
      description: 'Sample material description',
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id]/materials/[materialId] - Update material
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { id: campaignId, materialId } = await params;
    const body = await request.json();
    const validatedData = UpdateMaterialSchema.parse(body);

    return NextResponse.json({
      materialId,
      campaignId,
      ...validatedData,
      message: 'Material updated successfully',
    });
  } catch (error) {
    console.error('Error updating material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]/materials/[materialId] - Delete material
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { id: campaignId, materialId } = await params;

    return NextResponse.json({
      materialId,
      campaignId,
      message: 'Material deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
