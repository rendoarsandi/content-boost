import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    // TODO: Add PlatformRevenue model to Prisma schema
    // For now, just acknowledge the withdrawal request
    console.log(`Withdrawal request: Rp ${amount.toLocaleString('id-ID')}`);

    return NextResponse.json({
      message: 'Withdrawal request acknowledged (stubbed)',
      amount,
      newBalance: 0,
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { message: 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
}
