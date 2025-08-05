import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: complaintId } = await params;
    const { status, adminNotes } = await request.json();

    if (
      !['pending', 'investigating', 'resolved', 'rejected'].includes(status)
    ) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    // TODO: Add Complaint model to Prisma schema
    // For now, just log the operation
    console.log(
      `Complaint ${complaintId} status change to ${status} with notes: ${adminNotes}`
    );

    return NextResponse.json({
      message: 'Complaint status update acknowledged (stubbed)',
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    return NextResponse.json(
      { message: 'Failed to update complaint' },
      { status: 500 }
    );
  }
}
