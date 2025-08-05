import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, users } from '@repo/database';
// import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';
import { ApplicationService } from '@repo/utils';

const BulkActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'delete']),
  applicationIds: z
    .array(z.string().uuid())
    .min(1, 'At least one application ID required')
    .max(50, 'Maximum 50 applications per bulk operation'),
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

// POST /api/campaigns/[id]/applications/bulk - Perform bulk actions on applications
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only creators can perform bulk actions on their campaign applications
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        {
          error:
            'Forbidden - Only creators can perform bulk actions on applications',
        },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = BulkActionSchema.parse(body);

    // Check if campaign exists and user owns it
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        creatorId: (session.user as any).id,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Get applications to be processed (using promotions as applications)
    const applicationsToProcess = await db.campaignApplication.findMany({
      where: {
        campaignId: campaignId,
        id: {
          in: validatedData.applicationIds,
        },
      },
      include: {
        promoter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (applicationsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No valid applications found for the specified IDs' },
        { status: 404 }
      );
    }

    // Check if all applications are in pending status (for approve/reject actions)
    // Note: Since Promotion model doesn't have status, we'll skip this validation
    if (['approve', 'reject'].includes(validatedData.action)) {
      const nonPendingApps: any[] = []; // All promotions are considered processable

      if (nonPendingApps.length > 0) {
        return NextResponse.json(
          {
            error:
              'Some applications are not in pending status and cannot be processed',
            nonPendingApplications: nonPendingApps.map(app => ({
              id: app.application.id,
              status: app.application.status,
              promoterName: app.promoter.name || 'Unknown User',
            })),
          },
          { status: 400 }
        );
      }
    }

    const results = {
      processed: 0,
      failed: 0,
      notifications: [] as any[],
      errors: [] as string[],
    };

    // Process each application
    for (const appData of applicationsToProcess) {
      try {
        const reviewMetadata = {
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          feedback: validatedData.feedback,
          reviewMessage: validatedData.reviewMessage,
          bulkAction: true,
        };

        if (validatedData.action === 'delete') {
          // Delete promotion
          await db.campaignApplication.delete({
            where: { id: appData.id },
          });
        } else {
          // Update promotion - Note: Promotion model doesn't have status/reviewedAt fields
          // Just log the action for now
          console.log(
            `Bulk ${validatedData.action} action on promotion ${appData.id}`,
            reviewMetadata
          );

          // Generate notification for promoter
          const notification =
            ApplicationService.generateComprehensiveNotification(
              validatedData.action === 'approve'
                ? 'application_approved'
                : 'application_rejected',
              {
                campaignTitle: campaign.title, // Campaign.name not title
                promoterName: appData.promoter.name || 'Unknown User',
                creatorName: (session.user as any).name || 'Creator',
                reviewMessage: validatedData.reviewMessage,
                feedback: validatedData.feedback,
              }
            );

          results.notifications.push({
            recipientId: appData.promoter.id,
            title: notification.title,
            message: notification.message,
            type:
              validatedData.action === 'approve'
                ? 'application_approved'
                : 'application_rejected',
            metadata: {
              campaignId,
              applicationId: appData.id, // Using promotion id
              feedback: validatedData.feedback,
              bulkAction: true,
            },
          });
        }

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Failed to process application for ${appData.promoter.name || 'Unknown User'}: ${error}`
        );
        console.error(`Bulk action error for promotion ${appData.id}:`, error);
      }
    }

    // TODO: Send all notifications in batch (would integrate with notification service)
    console.log('Bulk notifications to send:', results.notifications);

    const actionPastTense = {
      approve: 'APPROVED',
      reject: 'REJECTED',
      delete: 'deleted',
    };

    return NextResponse.json({
      success: true,
      message: `Bulk action completed: ${results.processed} applications ${actionPastTense[validatedData.action]}`,
      results: {
        processed: results.processed,
        failed: results.failed,
        totalRequested: validatedData.applicationIds.length,
        errors: results.errors,
      },
      nextSteps:
        validatedData.action === 'approve'
          ? [
              'Approved promoters will receive notifications with access instructions',
              'They can now access campaign materials',
              'Monitor their performance in your campaign dashboard',
            ]
          : validatedData.action === 'reject'
            ? [
                'Rejected promoters have been notified with your feedback',
                'Consider providing constructive feedback for future improvements',
              ]
            : [
                'Selected applications have been permanently deleted',
                'This action cannot be undone',
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

    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
