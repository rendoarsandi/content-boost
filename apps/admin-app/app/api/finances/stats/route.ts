import { NextResponse } from 'next/server';
import { db } from '@repo/database';

export async function GET() {
  try {
    // TODO: Add Payout and PlatformRevenue models to Prisma schema
    // Return stub data for now
    const stats = {
      totalRevenue: 0,
      monthlyRevenue: 0,
      availableBalance: 0,
      totalWithdrawn: 0,
      pendingPayouts: 0,
      totalPayouts: 0,
      platformFeeRate: 5,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Financial stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch financial stats' },
      { status: 500 }
    );
  }
}