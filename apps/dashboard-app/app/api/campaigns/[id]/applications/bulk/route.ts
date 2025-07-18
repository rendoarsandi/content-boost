import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { campaigns, campaignApplications, users } from '@repo/database';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';
import { ApplicationService } from '@repo/utils';

const BulkActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'delete']),
  applicationIds: z.array(z.string().uuid()).min(1, 'At least one application ID required').max(50, 'Maximum 50 applications per bulk operation'),
  reviewMessage: z.string().max(500, 'Review message too long').optional(),
  feedback: z.object({
    contentQuality: z.number().min(1).max(5).optional(),
    alignmentWithBrand: z.number().min(1).max(5).optional(),
    creativityScore: z.number().min(1).max(5).optional(),
    notes: z.string().max(1000).optional(),
  }).optional(),
});

// POST /api/campaigns/[id]/applications/bulk - Perform bulk actions on applications
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can perform bulk actions on their campaign applications
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can perform bulk actions on applications' },
        { status: 403 }
      );
    }

    const campaignId = params.id;
    const body = await request.json();
    const validatedData = BulkActionSchema.parse(body);

    // Check if campaign exists and user owns it
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.creatorId, session.user.id)
        )
      );

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Get applications to be processed
    const applicationsToProcess = await db
      .select({
        application: campaignApplications,
        promoter: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(campaignApplications)
      .innerJoin(users, eq(campaignApplications.promoterId, users.id))
      .where(
        and(
          eq(campaignApplications.campaignId, campaignId),
          inArray(campaignApplications.id, validatedData.applicationIds)
        )
      );

    if (applicationsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No valid applications found for the specified IDs' },
        { status: 404 }
      );
    }

    // Check if all applications are in pending status (for approve/reject actions)
    if (['approve', 'reject'].includes(validatedData.action)) {
      const nonPendingApps = applicationsToProcess.filter(
        app => app.application.status !== 'pending'
      );

      if (nonPendingApps.length > 0) {
        return NextResponse.json(
          { 
            error: 'Some applications are not in pending status and cannot be processed',
            nonPendingApplications: nonPendingApps.map(app => ({
              id: app.application.id,
              status: app.application.status,
              promoterName: app.promoter.name
            }))
          },
          { status: 400 }
        );
      }
    }

    const results = {
      processed: 0,
      failed: 0,
      notifications: [] as any[],
      errors: [] as string[]
    };

    // Process each application
    for (const appData of applicationsToProcess) {
      try {
        const reviewMetadata = {
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          feedback: validatedData.feedback,
          reviewMessage: validatedData.reviewMessage,
          bulkAction: true
        };

        if (validatedData.action === 'delete') {
          // Delete application
          await db
            .delete(campaignApplications)
            .where(eq(campaignApplications.id, appData.application.id));
        } else {
          // Update application status
          const newStatus = validatedData.action === 'approve' ? 'approved' : 'rejected';
          
          await db
            .update(campaignApplications)
            .set({
              status: newStatus,
              reviewedAt: new Date(),
              metadata: {
                ...appData.application.metadata,
                review: reviewMetadata
              }
            })
            .where(eq(campaignApplications.id, appData.application.id));

          // Generate notification for promoter
          const notification = ApplicationService.generateComprehensiveNotification(
            newStatus === 'approved' ? 'application_approved' : 'application_rejected',
            {
              campaignTitle: campaign.title,
              promoterName: appData.promoter.name,
              creatorName: session.user.name || 'Creator',
              reviewMessage: validatedData.reviewMessage,
              feedback: validatedData.feedback
            }
          );

          results.notifications.push({
            recipientId: appData.promoter.id,
            title: notification.title,
            message: notification.message,
            type: newStatus === 'approved' ? 'application_approved' : 'application_rejected',
            metadata: {
              campaignId,
              applicationId: appData.application.id,
              feedback: validatedData.feedback,
              bulkAction: true
            }
          });
        }

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to process application for ${appData.promoter.name}: ${error}`);
        console.error(`Bulk action error for application ${appData.application.id}:`, error);
      }
    }

    // TODO: Send all notifications in batch (would integrate with notification service)
    console.log('Bulk notifications to send:', results.notifications);

    const actionPastTense = {
      approve: 'approved',
      reject: 'rejected',
      delete: 'deleted'
    };

    return NextResponse.json({
      success: true,
      message: `Bulk action completed: ${results.processed} applications ${actionPastTense[validatedData.action]}`,
      results: {
        processed: results.processed,
        failed: results.failed,
        totalRequested: validatedData.applicationIds.length,
        errors: results.errors
      },
      nextSteps: validatedData.action === 'approve' ? [
        'Approved promoters will receive notifications with access instructions',
        'They can now access campaign materials',
        'Monitor their performance in your campaign dashboard'
      ] : validatedData.action === 'reject' ? [
        'Rejected promoters have been notified with your feedback',
        'Consider providing constructive feedback for future improvements'
      ] : [
        'Selected applications have been permanently deleted',
        'This action cannot be undone'
      ]
    });
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

    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}