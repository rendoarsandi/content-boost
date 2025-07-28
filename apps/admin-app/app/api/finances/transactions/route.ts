import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { payouts, platformRevenue } from '@repo/database/schemas';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Get recent payouts as revenue transactions
    const recentPayouts = await db
      .select({
        id: payouts.id,
        amount: payouts.platformFee,
        description: payouts.id, // We'll format this
        status: payouts.status,
        createdAt: payouts.createdAt,
        processedAt: payouts.processedAt,
      })
      .from(payouts)
      .orderBy(desc(payouts.createdAt))
      .limit(20);

    // Get platform revenue records as withdrawal transactions
    const revenueRecords = await db
      .select()
      .from(platformRevenue)
      .orderBy(desc(platformRevenue.createdAt))
      .limit(10);

    // Transform payouts to transaction format
    const payoutTransactions = recentPayouts.map(payout => ({
      id: payout.id,
      type: 'revenue' as const,
      amount: Number(payout.amount),
      description: `Platform fee from payout ${payout.id.slice(0, 8)}...`,
      status: payout.status as 'completed' | 'pending' | 'failed',
      createdAt: payout.createdAt.toISOString(),
      processedAt: payout.processedAt?.toISOString(),
    }));

    // Transform revenue records to withdrawal transactions
    const withdrawalTransactions = revenueRecords
      .filter(record => record.withdrawnAmount > 0)
      .map(record => ({
        id: record.id,
        type: 'withdrawal' as const,
        amount: record.withdrawnAmount,
        description: `Platform withdrawal`,
        status: 'completed' as const,
        createdAt: record.createdAt.toISOString(),
        processedAt: record.createdAt.toISOString(),
      }));

    // Combine and sort all transactions
    const allTransactions = [...payoutTransactions, ...withdrawalTransactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return NextResponse.json(allTransactions);
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}