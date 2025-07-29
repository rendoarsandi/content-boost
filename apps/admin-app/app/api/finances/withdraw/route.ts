import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { platformRevenue } from '@repo/database/schemas';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    // Get current platform revenue
    const currentRevenue = await db
      .select()
      .from(platformRevenue)
      .orderBy(platformRevenue.createdAt)
      .limit(1);

    if (currentRevenue.length === 0) {
      return NextResponse.json(
        { message: 'No revenue data found' },
        { status: 404 }
      );
    }

    const revenue = currentRevenue[0];

    if (amount > revenue.availableBalance) {
      return NextResponse.json(
        { message: 'Insufficient balance for withdrawal' },
        { status: 400 }
      );
    }

    // Update platform revenue
    await db
      .update(platformRevenue)
      .set({
        withdrawnAmount: String(Number(revenue.withdrawnAmount) + amount),
        availableBalance: String(Number(revenue.availableBalance) - amount),
      })
      .where(eq(platformRevenue.id, revenue.id));

    // Log the withdrawal
    console.log(`Platform withdrawal of Rp ${amount.toLocaleString('id-ID')} processed by admin`);

    return NextResponse.json({
      message: 'Withdrawal processed successfully',
      amount,
      newBalance: Number(revenue.availableBalance) - amount,
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { message: 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
}