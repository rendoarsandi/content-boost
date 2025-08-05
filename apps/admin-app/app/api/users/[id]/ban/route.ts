import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // TODO: Add status field to User model in Prisma schema
    // For now, just log the ban action
    console.log(`User ${userId} has been banned by admin`);

    return NextResponse.json({
      message: 'User ban acknowledged (stubbed)',
    });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json(
      { message: 'Failed to ban user' },
      { status: 500 }
    );
  }
}
