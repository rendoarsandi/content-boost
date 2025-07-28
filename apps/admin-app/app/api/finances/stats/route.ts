import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { payouts, platformRevenue } from '@repo/database/schemas';
import { eq, gte, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total revenue (sum of all platform fees)
    const totalRevenueResult = await db
      .select({ total: sql<number>`sum(${payouts.platformFee})` })
      .from(payouts)
      .where(eq(payouts.status, 'completed'));
    const totalRevenue = Number(totalRevenueResult[0]?.total || 0);

    // Get monthly revenue (current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyRevenueResult = await db
      .select({ total: sql<number>`sum(${payouts.platformFee})` })
      .from(payouts)
      .where(
        eq(payouts.status, 'completed') &&
        gte(payouts.createdAt, currentMonth)
      );
    const monthlyRevenue = Number(monthlyRevenueResult[0]?.total || 0);

    // Get platform revenue data
    const platformRevenueData = await db
      .select()
      .from(platformRevenue)
      .orderBy(platformRevenue.createdAt)
      .limit(1);

    const availableBalance = platformRevenueData[0]?.availableBalance || 0;
    const totalWithdrawn = platformRevenueData[0]?.withdrawnAmount || 0;

    // Get pending payouts
    const pendingPayoutsResult = await db
      .select({ total: sql<number>`sum(${payouts.netAmount})` })
      .from(payouts)
      .where(eq(payouts.status, 'pending'));
    const pendingPayouts = Number(pendingPayoutsResult[0]?.total || 0);

    // Get total payouts
    const totalPayoutsResult = await db
      .select({ total: sql<number>`sum(${payouts.netAmount})` })
      .from(payouts)
      .where(eq(payouts.status, 'completed'));
    const totalPayouts = Number(totalPayoutsResult[0]?.total || 0);

    // Platform fee rate (configurable, default 5%)
    const platformFeeRate = 5;

    return NextResponse.json({
      totalRevenue,
      monthlyRevenue,
      availableBalance,
      totalWithdrawn,
      pendingPayouts,
      totalPayouts,
      platformFeeRate,
    });
  } catch (error) {
    console.error('Financial stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch financial stats' },
      { status: 500 }
    );
  }
}