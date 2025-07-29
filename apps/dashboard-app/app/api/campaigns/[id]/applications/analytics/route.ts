import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, users } from '@repo/database';
// import { eq, and, desc, count } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';
import { ApplicationService } from '@repo/utils';

// GET /api/campaigns/[id]/applications/analytics - Get application analytics for campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators and admins can view application analytics
    if (session.user.role !== 'creator' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators and admins can view application analytics' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;

    // Check if campaign exists and user owns it (for creators)
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        session.user.role === 'creator' 
          ? and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, session.user.id))
          : eq(campaigns.id, campaignId)
      );

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Get all applications for the campaign
    const applications = await db
      .select({
        application: campaignApplications,
        promoter: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(campaignApplications)
      .innerJoin(users, eq(campaignApplications.promoterId, users.id))
      .where(eq(campaignApplications.campaignId, campaignId))
      .orderBy(desc(campaignApplications.appliedAt));

    // Calculate metrics using ApplicationService
    const metrics = ApplicationService.calculateApplicationMetrics(
      applications.map(app => ({
        status: app.application.status,
        appliedAt: app.application.appliedAt
      }))
    );

    // Calculate additional analytics
    const applicationsByDay = applications.reduce((acc, app) => {
      const day = app.application.appliedAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = {
      pending: applications.filter(app => app.application.status === 'pending').length,
      approved: applications.filter(app => app.application.status === 'approved').length,
      rejected: applications.filter(app => app.application.status === 'rejected').length,
    };

    // Calculate quality scores from metadata if available
    const qualityScores = applications
      .map(app => app.application.metadata?.applicationScore)
      .filter(score => typeof score === 'number');

    const averageQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0;

    // Get top performing promoters (approved applications)
    const topPromoters = applications
      .filter(app => app.application.status === 'approved')
      .slice(0, 10)
      .map(app => ({
        id: app.promoter.id,
        name: app.promoter.name,
        appliedAt: app.application.appliedAt,
        score: app.application.metadata?.applicationScore || 0
      }));

    const analytics = {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
      },
      metrics,
      trends: {
        applicationsByDay,
        statusDistribution,
        averageQualityScore: Math.round(averageQualityScore * 100) / 100,
      },
      insights: {
        totalApplications: metrics.total,
        conversionRate: metrics.approvalRate,
        averageResponseTime: metrics.averageResponseTime,
        topPromoters,
        qualityDistribution: {
          high: qualityScores.filter(score => score >= 80).length,
          medium: qualityScores.filter(score => score >= 60 && score < 80).length,
          low: qualityScores.filter(score => score < 60).length,
        }
      },
      recommendations: generateAnalyticsRecommendations(metrics, averageQualityScore)
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching application analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateAnalyticsRecommendations(
  metrics: ReturnType<typeof ApplicationService.calculateApplicationMetrics>,
  averageQualityScore: number
): string[] {
  const recommendations: string[] = [];

  if (metrics.approvalRate < 30) {
    recommendations.push('Consider reviewing your campaign requirements - low approval rate may indicate they are too strict');
  }

  if (metrics.averageResponseTime > 72) {
    recommendations.push('Try to review applications faster - long response times may discourage quality promoters');
  }

  if (averageQualityScore < 50) {
    recommendations.push('Consider providing clearer campaign guidelines to attract higher quality applications');
  }

  if (metrics.pending > 10) {
    recommendations.push('You have many pending applications - consider reviewing them to maintain promoter engagement');
  }

  if (metrics.total < 5) {
    recommendations.push('Consider promoting your campaign more to attract additional promoter applications');
  }

  if (recommendations.length === 0) {
    recommendations.push('Your campaign is performing well! Keep monitoring application quality and response times.');
  }

  return recommendations;
}