import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { complaints, users } from '@repo/database/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all complaints with user info
    const allComplaints = await db
      .select({
        id: complaints.id,
        userId: complaints.userId,
        userName: users.name,
        userEmail: users.email,
        subject: complaints.subject,
        description: complaints.description,
        status: complaints.status,
        priority: complaints.priority,
        adminNotes: complaints.adminNotes,
        createdAt: complaints.createdAt,
        updatedAt: complaints.updatedAt,
      })
      .from(complaints)
      .leftJoin(users, eq(complaints.userId, users.id))
      .orderBy(desc(complaints.createdAt));

    const transformedComplaints = allComplaints.map(complaint => ({
      id: complaint.id,
      userId: complaint.userId,
      userName: complaint.userName || 'Unknown User',
      userEmail: complaint.userEmail || 'Unknown Email',
      subject: complaint.subject,
      description: complaint.description,
      status: complaint.status,
      priority: complaint.priority,
      adminNotes: complaint.adminNotes,
      createdAt: complaint.createdAt.toISOString(),
      updatedAt: complaint.updatedAt.toISOString(),
    }));

    return NextResponse.json(transformedComplaints);
  } catch (error) {
    console.error('Complaints fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch complaints' },
      { status: 500 }
    );
  }
}