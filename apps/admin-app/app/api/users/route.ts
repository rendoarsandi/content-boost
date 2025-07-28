import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { users, campaigns, payouts } from '@repo/database/schemas';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all users with additional stats
    const allUsers = await db.select().from(users);
    
    // Get campaign counts for creators
    const campaignCounts = await db
      .select({
        creatorId: campaigns.creatorId,
        count: sql<number>`count(*)`
      })
      .from(campaigns)
      .groupBy(campaigns.creatorId);

    // Get earnings for promoters
    const earnings = await db
      .select({
        promoterId: payouts.promoterId,
        total: sql<number>`sum(${payouts.netAmount})`
      })
      .from(payouts)
      .where(eq(payouts.status, 'completed'))
      .groupBy(payouts.promoterId);

    // Combine data
    const usersWithStats = allUsers.map(user => {
      const campaignCount = campaignCounts.find(c => c.creatorId === user.id);
      const userEarnings = earnings.find(e => e.promoterId === user.id);
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || 'active',
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        campaignsCount: user.role === 'creator' ? (campaignCount?.count || 0) : undefined,
        totalEarnings: user.role === 'promoter' ? Number(userEarnings?.total || 0) : undefined,
      };
    });

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}