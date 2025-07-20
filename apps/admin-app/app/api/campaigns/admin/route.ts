import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { campaigns, users, campaignApplications, viewRecords } from '@repo/database/schema';
import { eq, count, sum } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all campaigns with creator info
    const allCampaigns = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        description: campaigns.description,
        budget: campaigns.budget,
        ratePerView: campaigns.ratePerView,
        status: campaigns.status,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        createdAt: campaigns.createdAt,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(campaigns)
      .leftJoin(users, eq(campaigns.creatorId, users.id));

    // Get application counts for each campaign
    const applicationCounts = await db
      .select({
        campaignId: campaignApplications.campaignId,
        count: count()
      })
      .from(campaignApplications)
      .groupBy(campaignApplications.campaignId);

    // Get view stats for each campaign
    const viewStats = await db
      .select({
        campaignId: viewRecords.campaignId,
        totalViews: sum(viewRecords.viewCount),
      })
      .from(viewRecords)
      .where(eq(viewRecords.isLegitimate, true))
      .groupBy(viewRecords.campaignId);

    // Combine data
    const campaignsWithStats = allCampaigns.map(campaign => {
      const applicationCount = applicationCounts.find(a => a.campaignId === campaign.id);
      const viewStat = viewStats.find(v => v.campaignId === campaign.id);
      const totalViews = Number(viewStat?.totalViews || 0);
      const totalSpent = totalViews * campaign.ratePerView;
      
      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        creatorName: campaign.creatorName,
        creatorEmail: campaign.creatorEmail,
        budget: campaign.budget,
        ratePerView: campaign.ratePerView,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        createdAt: campaign.createdAt,
        applicationsCount: applicationCount?.count || 0,
        totalViews,
        totalSpent,
      };
    });

    return NextResponse.json(campaignsWithStats);
  } catch (error) {
    console.error('Admin campaigns fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}