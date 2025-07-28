import { NextResponse } from 'next/server';
// import { prisma } from '@repo/database';

export async function GET() {
  try {
    // LOGIKA DATABASE DIKOMENTARI SEMENTARA
    // const campaignsWithStats = await prisma.campaign.findMany({ ... });
    
    // Mengembalikan data dummy
    const dummyCampaigns = [
      { id: 'campaign-1', title: 'Dummy Campaign 1', budget: 1000, ratePerView: 10, status: 'active', creatorName: 'Dummy Creator', applicationsCount: 5, totalViews: 150, totalSpent: 1500 },
      { id: 'campaign-2', title: 'Dummy Campaign 2', budget: 5000, ratePerView: 15, status: 'completed', creatorName: 'Another Creator', applicationsCount: 12, totalViews: 300, totalSpent: 4500 },
    ];
    return NextResponse.json(dummyCampaigns);

  } catch (error) {
    console.error('Admin campaigns fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}