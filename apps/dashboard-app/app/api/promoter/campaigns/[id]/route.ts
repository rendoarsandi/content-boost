import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { campaigns, campaignMaterials, users, campaignApplications } from '@repo/database';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';

// GET /api/promoter/campaigns/[id] - Get campaign details for promoter
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can view campaign details' },
        { status: 401 }
      );
    }

    const campaignId = params.id;
    const promoterId = (session.user as any).id;

    // Get campaign with creator info
    const campaignData = await db
      .select({
        campaign: campaigns,
        creator: {
          id: users.id,
          name: users.name,
        },
      })
      .from(campaigns)
      .innerJoin(users, eq(campaigns.creatorId, users.id))
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaignData.length) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get campaign materials
    const materials = await db
      .select()
      .from(campaignMaterials)
      .where(eq(campaignMaterials.campaignId, campaignId));

    // Check if promoter has applied
    const application = await db
      .select()
      .from(campaignApplications)
      .where(
        and(
          eq(campaignApplications.campaignId, campaignId),
          eq(campaignApplications.promoterId, promoterId)
        )
      )
      .limit(1);

    const { campaign, creator } = campaignData[0];

    return NextResponse.json({
      campaign: {
        ...campaign,
        creator,
        materials,
        application: application[0] || null,
        hasApplied: application.length > 0,
      }
    });
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}