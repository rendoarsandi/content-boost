import { NextResponse } from 'next/server';
import { db } from '@repo/database';

export async function GET() {
  try {
    // TODO: Add Payout and PlatformRevenue models to Prisma schema
    // Return empty array for now
    const transactions: any[] = [];

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}