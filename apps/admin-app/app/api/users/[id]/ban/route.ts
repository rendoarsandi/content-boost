import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { users } from '@repo/database/schemas';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Update user status to banned
    await db
      .update(users)
      .set({ 
        status: 'banned',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log the ban action
    console.log(`User ${userId} has been banned by admin`);

    return NextResponse.json({ 
      message: 'User banned successfully' 
    });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json(
      { message: 'Failed to ban user' },
      { status: 500 }
    );
  }
}