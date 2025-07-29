import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { complaints } from '@repo/database/schemas';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: complaintId } = await params;
    const { status, adminNotes } = await request.json();

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update complaint
    await db
      .update(complaints)
      .set({
        status,
        adminNotes,
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, complaintId));

    // Log the update
    console.log(`Complaint ${complaintId} updated to ${status} by admin`);

    return NextResponse.json({
      message: 'Complaint updated successfully',
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    return NextResponse.json(
      { message: 'Failed to update complaint' },
      { status: 500 }
    );
  }
}