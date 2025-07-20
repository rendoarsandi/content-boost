import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { viewRecords, campaigns, campaignApplications, payouts } from '@repo/database';
import { eq, and, gte, desc, sum, count, avg } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';

// GET /api/promoter/analytics - Get promoter analytics with bot detection insights
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can access analytics' },
        { status: 401 }
      );
    }

    const promoterId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const campaignId = searchParams.get('campaignId');

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Base query conditions
    let baseConditions = [
      eq(viewRecords.promoterId, promoterId),
      gte(viewRecords.timestamp, startDate)
    ];

    if (campaignId) {
      baseConditions.push(eq(viewRecords.campaignId, campaignId));
    }

    // Get view analytics with bot detection insights
    const viewAnalytics = await db
      .select({
        totalViews: sum(viewRecords.viewCount),
        legitimateViews: count(viewRecords.id),
        avgBotScore: avg(viewRecords.botScore),
        totalLikes: sum(viewRecords.likeCount),
        totalComments: sum(viewRecords.commentCount),
        totalShares: sum(viewRecords.shareCount),
      })
      .from(viewRecords)
      .where(and(...baseConditions, eq(viewRecords.isLegitimate, true)));

    // Get bot detection stats
    const botStats = await db
      .select({
        totalRecords: count(viewRecords.id),
        legitimateRecords: count(viewRecords.id),
        botScore: viewRecords.botScore,
      })
      .from(viewRecords)
      .where(and(...baseConditions))
      .groupBy(viewRecords.isLegitimate, viewRecords.botScore);

    // Calculate bot detection insights
    const totalRecords = botStats.reduce((sum, stat) => sum + stat.totalRecords, 0);
    const legitimateRecords = botStats.filter(stat => stat.legitimateRecords > 0).reduce((sum, stat) => sum + stat.legitimateRecords, 0);
    const botDetectionRate = totalRecords > 0 ? ((totalRecords - legitimateRecords) / totalRecords) * 100 : 0;

    // Get performance by campaign
    const campaignPerformance = await db
      .select({
        campaignId: viewRecords.campaignId,
        campaignTitle: campaigns.title,
        totalViews: sum(viewRecords.viewCount),
        legitimateViews: count(viewRecords.id),
        avgBotScore: avg(viewRecords.botScore),
        totalLikes: sum(viewRecords.likeCount),
        totalComments: sum(viewRecords.commentCount),
        ratePerView: campaigns.ratePerView,
      })
      .from(viewRecords)
      .innerJoin(campaigns, eq(viewRecords.campaignId, campaigns.id))
      .where(and(...baseConditions, eq(viewRecords.isLegitimate, true)))
      .groupBy(viewRecords.campaignId, campaigns.title, campaigns.ratePerView)
      .orderBy(desc(sum(viewRecords.viewCount)));

    // Get daily performance trend
    const dailyTrend = await db
      .select({
        date: viewRecords.timestamp,
        views: sum(viewRecords.viewCount),
        legitimateViews: count(viewRecords.id),
        avgBotScore: avg(viewRecords.botScore),
      })
      .from(viewRecords)
      .where(and(...baseConditions, eq(viewRecords.isLegitimate, true)))
      .groupBy(viewRecords.timestamp)
      .orderBy(desc(viewRecords.timestamp))
      .limit(parseInt(period));

    // Get earnings analytics
    const earningsAnalytics = await db
      .select({
        totalEarnings: sum(payouts.netAmount),
        pendingEarnings: sum(payouts.netAmount),
        completedPayouts: count(payouts.id),
      })
      .from(payouts)
      .where(
        and(
          eq(payouts.promoterId, promoterId),
          gte(payouts.createdAt, startDate),
          campaignId ? eq(payouts.campaignId, campaignId) : undefined
        )
      )
      .groupBy(payouts.status);

    // Calculate engagement rates
    const totalViews = Number(viewAnalytics[0]?.totalViews || 0);
    const totalLikes = Number(viewAnalytics[0]?.totalLikes || 0);
    const totalComments = Number(viewAnalytics[0]?.totalComments || 0);
    const totalShares = Number(viewAnalytics[0]?.totalShares || 0);

    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews) * 100 : 0;
    const likeRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
    const commentRate = totalViews > 0 ? (totalComments / totalViews) * 100 : 0;

    return NextResponse.json({
      period: parseInt(period),
      overview: {
        totalViews,
        legitimateViews: Number(viewAnalytics[0]?.legitimateViews || 0),
        avgBotScore: Number(viewAnalytics[0]?.avgBotScore || 0),
        botDetectionRate: Math.round(botDetectionRate * 100) / 100,
        engagementRate: Math.round(engagementRate * 100) / 100,
        likeRate: Math.round(likeRate * 100) / 100,
        commentRate: Math.round(commentRate * 100) / 100,
      },
      campaignPerformance: campaignPerformance.map(campaign => ({
        ...campaign,
        totalViews: Number(campaign.totalViews || 0),
        legitimateViews: Number(campaign.legitimateViews || 0),
        avgBotScore: Number(campaign.avgBotScore || 0),
        totalLikes: Number(campaign.totalLikes || 0),
        totalComments: Number(campaign.totalComments || 0),
        estimatedEarnings: Number(campaign.legitimateViews || 0) * Number(campaign.ratePerView || 0),
      })),
      dailyTrend: dailyTrend.map(day => ({
        date: day.date,
        views: Number(day.views || 0),
        legitimateViews: Number(day.legitimateViews || 0),
        avgBotScore: Number(day.avgBotScore || 0),
      })),
      earnings: {
        total: earningsAnalytics.find(e => e.completedPayouts)?.totalEarnings || 0,
        pending: earningsAnalytics.find(e => e.pendingEarnings)?.pendingEarnings || 0,
        completedPayouts: earningsAnalytics.find(e => e.completedPayouts)?.completedPayouts || 0,
      },
      botDetection: {
        totalRecords,
        legitimateRecords,
        botRecords: totalRecords - legitimateRecords,
        detectionRate: botDetectionRate,
        avgBotScore: Number(viewAnalytics[0]?.avgBotScore || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching promoter analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}