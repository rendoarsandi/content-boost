import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { viewRecords, users, campaigns } from '@repo/database/schema';
import { eq, and, gte } from 'drizzle-orm';

export async function GET() {
  try {
    // Get bot detections from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get suspicious view records with user and campaign info
    const botDetections = await db
      .select({
        id: viewRecords.id,
        promoterId: viewRecords.promoterId,
        promoterName: users.name,
        promoterEmail: users.email,
        campaignId: viewRecords.campaignId,
        campaignTitle: campaigns.title,
        platform: viewRecords.platform,
        viewCount: viewRecords.viewCount,
        likeCount: viewRecords.likeCount,
        commentCount: viewRecords.commentCount,
        shareCount: viewRecords.shareCount,
        botScore: viewRecords.botScore,
        isLegitimate: viewRecords.isLegitimate,
        timestamp: viewRecords.timestamp,
      })
      .from(viewRecords)
      .leftJoin(users, eq(viewRecords.promoterId, users.id))
      .leftJoin(campaigns, eq(viewRecords.campaignId, campaigns.id))
      .where(
        and(
          gte(viewRecords.timestamp, sevenDaysAgo),
          gte(viewRecords.botScore, 20) // Only show records with bot score >= 20%
        )
      )
      .orderBy(viewRecords.timestamp);

    // Transform data to match the expected format
    const transformedDetections = botDetections.map(record => {
      const viewLikeRatio = record.likeCount > 0 ? record.viewCount / record.likeCount : record.viewCount;
      const viewCommentRatio = record.commentCount > 0 ? record.viewCount / record.commentCount : record.viewCount;
      
      let confidence: 'low' | 'medium' | 'high' = 'low';
      let action: 'none' | 'monitor' | 'warning' | 'ban' = 'none';
      
      if (record.botScore >= 90) {
        confidence = 'high';
        action = 'ban';
      } else if (record.botScore >= 50) {
        confidence = 'medium';
        action = 'warning';
      } else if (record.botScore >= 20) {
        confidence = 'low';
        action = 'monitor';
      }

      // Check for spike detection (simplified)
      const spikeDetected = viewLikeRatio > 10 || viewCommentRatio > 100;
      const spikePercentage = spikeDetected ? Math.max(viewLikeRatio * 10, viewCommentRatio) : undefined;

      let reason = 'Normal activity detected';
      if (viewLikeRatio > 10) reason = 'Abnormal view-to-like ratio detected';
      if (viewCommentRatio > 100) reason = 'Abnormal view-to-comment ratio detected';
      if (spikeDetected) reason = 'Suspicious activity spike detected';

      return {
        id: record.id,
        promoterId: record.promoterId,
        promoterName: record.promoterName || 'Unknown',
        promoterEmail: record.promoterEmail || 'Unknown',
        campaignId: record.campaignId,
        campaignTitle: record.campaignTitle || 'Unknown Campaign',
        platform: record.platform,
        botScore: record.botScore,
        confidence,
        action,
        status: record.isLegitimate ? 'dismissed' : 'pending',
        detectedAt: record.timestamp,
        metrics: {
          viewCount: record.viewCount,
          likeCount: record.likeCount,
          commentCount: record.commentCount,
          viewLikeRatio,
          viewCommentRatio,
          spikeDetected,
          spikePercentage,
        },
        reason,
      };
    });

    return NextResponse.json(transformedDetections);
  } catch (error) {
    console.error('Bot detections fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch bot detections' },
      { status: 500 }
    );
  }
}