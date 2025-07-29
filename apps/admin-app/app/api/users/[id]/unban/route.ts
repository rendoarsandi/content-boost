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

    // Update user status to active
    await db
      .update(users)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log the unban action
    console.log(`User ${userId} has been unbanned by admin`);

    return NextResponse.json({ 
      message: 'User unbanned successfully' 
    });
  } catch (error) {
    console.error('Unban user error:', error);
    return NextResponse.json(
      { message: 'Failed to unban user' },
      { status: 500 }
    );
  }
}