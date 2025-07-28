import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { viewRecords, users } from '@repo/database/schemas';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const detectionId = params.id;
    const { action } = await request.json();

    if (!['approve', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get the view record
    const viewRecord = await db
      .select()
      .from(viewRecords)
      .where(eq(viewRecords.id, detectionId))
      .limit(1);

    if (viewRecord.length === 0) {
      return NextResponse.json(
        { message: 'Detection not found' },
        { status: 404 }
      );
    }

    const record = viewRecord[0];

    if (action === 'approve') {
      // Mark as not legitimate (confirm bot detection)
      await db
        .update(viewRecords)
        .set({ isLegitimate: false })
        .where(eq(viewRecords.id, detectionId));

      // If high confidence, ban the user
      if (record.botScore >= 90) {
        await db
          .update(users)
          .set({ 
            status: 'banned',
            updatedAt: new Date()
          })
          .where(eq(users.id, record.promoterId));
        
        console.log(`User ${record.promoterId} banned due to bot detection approval`);
      }

      console.log(`Bot detection ${detectionId} approved by admin`);
    } else {
      // Mark as legitimate (dismiss as false positive)
      await db
        .update(viewRecords)
        .set({ isLegitimate: true })
        .where(eq(viewRecords.id, detectionId));

      console.log(`Bot detection ${detectionId} dismissed as false positive by admin`);
    }

    return NextResponse.json({ 
      message: `Detection ${action === 'approve' ? 'approved' : 'dismissed'} successfully` 
    });
  } catch (error) {
    console.error('Review detection error:', error);
    return NextResponse.json(
      { message: 'Failed to review detection' },
      { status: 500 }
    );
  }
}