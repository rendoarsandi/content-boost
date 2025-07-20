import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { viewRecords, users } from '@repo/database/schema';
import { eq, count, and, gte } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total detections (bot score >= 20)
    const totalDetectionsResult = await db
      .select({ count: count() })
      .from(viewRecords)
      .where(gte(viewRecords.botScore, 20));
    const totalDetections = totalDetectionsResult[0]?.count || 0;

    // Get pending review (not legitimate and bot score >= 50)
    const pendingReviewResult = await db
      .select({ count: count() })
      .from(viewRecords)
      .where(
        and(
          eq(viewRecords.isLegitimate, false),
          gte(viewRecords.botScore, 50)
        )
      );
    const pendingReview = pendingReviewResult[0]?.count || 0;

    // Get high confidence detections (bot score >= 90)
    const highConfidenceResult = await db
      .select({ count: count() })
      .from(viewRecords)
      .where(gte(viewRecords.botScore, 90));
    const highConfidence = highConfidenceResult[0]?.count || 0;

    // Get banned users
    const bannedUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'banned'));
    const bannedUsers = bannedUsersResult[0]?.count || 0;

    // Get false positives (legitimate records with bot score >= 20)
    const falsePositivesResult = await db
      .select({ count: count() })
      .from(viewRecords)
      .where(
        and(
          eq(viewRecords.isLegitimate, true),
          gte(viewRecords.botScore, 20)
        )
      );
    const falsePositives = falsePositivesResult[0]?.count || 0;

    return NextResponse.json({
      totalDetections,
      pendingReview,
      highConfidence,
      bannedUsers,
      falsePositives,
    });
  } catch (error) {
    console.error('Bot detection stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch bot detection stats' },
      { status: 500 }
    );
  }
}