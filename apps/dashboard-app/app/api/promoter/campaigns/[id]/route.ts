import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
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
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: {
          select: { id: true, name: true }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get campaign materials (if this table exists in Prisma schema)
    // const materials = await db.campaignMaterial.findMany({
    //   where: { campaignId }
    // });

    // Check if promoter has applied
    const application = await db.promotion.findFirst({
      where: {
        campaignId,
        promoterId
      }
    });

    const materials: any[] = []; // Placeholder until we confirm the table structure

    return NextResponse.json({
      campaign: {
        ...campaign,
        materials,
        application: application || null,
        hasApplied: !!application,
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