import { NextResponse } from 'next/server';
import { db } from '@repo/database';

export async function GET() {
  try {
    // TODO: Add Complaint model to Prisma schema
    // Return empty array for now
    const complaints: any[] = [];

    return NextResponse.json(complaints);
  } catch (error) {
    console.error('Complaints fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch complaints' },
      { status: 500 }
    );
  }
}