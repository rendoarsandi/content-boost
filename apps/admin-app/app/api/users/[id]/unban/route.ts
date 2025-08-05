import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // TODO: Add status field to User model in Prisma schema
    // For now, just log the unban action
    console.log(`User ${userId} has been unbanned by admin`);

    return NextResponse.json({
      message: 'User unban acknowledged (stubbed)',
    });
  } catch (error) {
    console.error('Unban user error:', error);
    return NextResponse.json(
      { message: 'Failed to unban user' },
      { status: 500 }
    );
  }
}
