import { NextResponse } from 'next/server';
// import { prisma } from '@repo/database';

export async function GET() {
  try {
    // LOGIKA DATABASE DIKOMENTARI SEMENTARA

    // Mengembalikan data dummy
    const dummyStats = {
      totalUsers: 150,
      totalCreators: 45,
      totalPromoters: 105,
      activeCampaigns: 12,
      totalCampaigns: 50,
      botDetections: 25,
      platformRevenue: 1250000,
      pendingPayouts: 300000,
    };
    return NextResponse.json(dummyStats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
