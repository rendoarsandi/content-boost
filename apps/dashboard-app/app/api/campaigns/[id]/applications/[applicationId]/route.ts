import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EnhancedReviewApplicationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewMessage: z.string().max(500, 'Review message too long').optional(),
  feedback: z
    .object({
      contentQuality: z.number().min(1).max(5).optional(),
      alignmentWithBrand: z.number().min(1).max(5).optional(),
      creativityScore: z.number().min(1).max(5).optional(),
      notes: z.string().max(1000).optional(),
    })
    .optional(),
});

// PUT /api/campaigns/[id]/applications/[applicationId] - Simplified review application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const { id: campaignId, applicationId } = await params;
    const body = await request.json();
    const validatedData = EnhancedReviewApplicationSchema.parse(body);

    const statusMessage =
      validatedData.status === 'APPROVED'
        ? 'Application approved successfully. The promoter can now access campaign materials.'
        : 'Application rejected. The promoter has been notified with your feedback.';

    return NextResponse.json({
      application: {
        id: applicationId,
        campaignId,
        status: validatedData.status,
        reviewMessage: validatedData.reviewMessage,
        feedback: validatedData.feedback,
      },
      message: statusMessage,
      nextSteps:
        validatedData.status === 'APPROVED'
          ? [
              'Promoter will receive notification with access instructions',
              'Promoter can now access campaign materials',
              'Tracking will begin once promoter starts promoting',
            ]
          : [
              'Promoter has been notified of rejection with your feedback',
              'They may improve and apply to future campaigns',
            ],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('Error reviewing application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/campaigns/[id]/applications/[applicationId] - Get specific application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const { id: campaignId, applicationId } = await params;

    return NextResponse.json({
      application: {
        id: applicationId,
        campaignId,
        status: 'PENDING',
        submittedContent: 'Sample content',
        appliedAt: new Date().toISOString(),
      },
      campaign: {
        id: campaignId,
        title: 'Sample Campaign',
        description: 'Sample campaign description',
        budget: 1000,
        ratePerView: 1000,
      },
      promoter: {
        id: 'sample-promoter',
        name: 'Sample Promoter',
        email: 'promoter@example.com',
      },
      creator: {
        id: 'sample-creator',
        name: 'Sample Creator',
        email: 'creator@example.com',
      },
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
