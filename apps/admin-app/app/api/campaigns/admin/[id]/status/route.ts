import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { campaigns } from '@repo/database/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    const { status } = await request.json();

    if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update campaign status
    await db
      .update(campaigns)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId));

    // Log the status change
    console.log(`Campaign ${campaignId} status changed to ${status} by admin`);

    return NextResponse.json({ 
      message: 'Campaign status updated successfully' 
    });
  } catch (error) {
    console.error('Update campaign status error:', error);
    return NextResponse.json(
      { message: 'Failed to update campaign status' },
      { status: 500 }
    );
  }
}