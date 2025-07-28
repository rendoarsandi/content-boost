import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { users, campaigns, payouts, viewRecords } from '@repo/database/schemas';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total users count
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get creators count
    const creatorsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'creator'));
    const totalCreators = creatorsResult[0]?.count || 0;

    // Get promoters count
    const promotersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'promoter'));
    const totalPromoters = promotersResult[0]?.count || 0;

    // Get total campaigns
    const totalCampaignsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns);
    const totalCampaigns = totalCampaignsResult[0]?.count || 0;

    // Get active campaigns
    const activeCampaignsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.status, 'active'));
    const activeCampaigns = activeCampaignsResult[0]?.count || 0;

    // Get bot detections in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const botDetectionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(viewRecords)
      .where(
        and(
          eq(viewRecords.isLegitimate, false),
          gte(viewRecords.timestamp, yesterday)
        )
      );
    const botDetections = botDetectionsResult[0]?.count || 0;

    // Get platform revenue (sum of platform fees from completed payouts)
    const platformRevenueResult = await db
      .select({ total: sql<number>`sum(${payouts.platformFee})` })
      .from(payouts)
      .where(eq(payouts.status, 'completed'));
    const platformRevenue = Number(platformRevenueResult[0]?.total || 0);

    // Get pending payouts
    const pendingPayoutsResult = await db
      .select({ total: sql<number>`sum(${payouts.netAmount})` })
      .from(payouts)
      .where(eq(payouts.status, 'pending'));
    const pendingPayouts = Number(pendingPayoutsResult[0]?.total || 0);

    return NextResponse.json({
      totalUsers,
      totalCreators,
      totalPromoters,
      activeCampaigns,
      totalCampaigns,
      botDetections,
      platformRevenue,
      pendingPayouts,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}