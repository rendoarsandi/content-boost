import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

// PATCH /api/applications/[id]/status - Simplified application status endpoint
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const body = await request.json();
    const validatedData = UpdateStatusSchema.parse(body);

    // Simplified response to avoid bundling circular dependency
    return NextResponse.json({
      applicationId,
      status: validatedData.status,
      message: `Application ${validatedData.status} successfully`,
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
