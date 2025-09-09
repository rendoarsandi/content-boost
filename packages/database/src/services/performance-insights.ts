import { createClient } from '@supabase/supabase-js';

interface PerformanceMetrics {
  promoter_id: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  start_date: string;
  end_date: string;
  campaigns_completed: number;
  total_earnings: number;
  avg_rating: number;
  total_views: number;
  total_clicks: number;
  total_conversions: number;
  click_through_rate: number;
  conversion_rate: number;
  earnings_per_campaign: number;
  views_per_campaign: number;
}

interface TimeBasedInsight {
  insight_type:
    | 'peak_hours'
    | 'best_days'
    | 'seasonal_trends'
    | 'posting_frequency';
  title: string;
  description: string;
  data: {
    labels: string[];
    values: number[];
    recommendation: string;
    confidence_score: number;
  };
  actionable_tips: string[];
}

interface PerformanceComparison {
  metric: string;
  current_period: number;
  previous_period: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  benchmark: number;
  percentile_rank: number;
}

interface PromoterInsight {
  id: string;
  promoter_id: string;
  insight_type:
    | 'performance_trend'
    | 'opportunity'
    | 'optimization'
    | 'benchmark';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data: Record<string, any>;
  actionable_recommendations: string[];
  generated_at: string;
}

export class PerformanceInsightsService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getPerformanceMetrics(
    promoterId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month',
    startDate?: string,
    endDate?: string
  ): Promise<{ metrics: PerformanceMetrics | null; error: string | null }> {
    try {
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : this.getStartDate(end, period);

      // Get campaign applications for the period
      const { data: applications, error: appsError } = await this.supabase
        .from('applications')
        .select(
          `
          id,
          campaign_id,
          status,
          created_at,
          campaigns!inner(
            id,
            budget,
            created_at
          )
        `
        )
        .eq('promoter_id', promoterId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (appsError) {
        return { metrics: null, error: appsError.message };
      }

      // Get performance data (views, clicks, conversions)
      const campaignIds =
        applications?.map((app: any) => app.campaign_id) || [];
      let performanceData: any[] = [];

      if (campaignIds.length > 0) {
        const { data: perfData } = await this.supabase
          .from('campaign_analytics')
          .select('views, clicks, conversions, revenue')
          .eq('promoter_id', promoterId)
          .in('campaign_id', campaignIds);

        performanceData = perfData || [];
      }

      // Calculate metrics
      const completedCampaigns =
        applications?.filter((app: any) => app.status === 'completed').length ||
        0;
      const totalViews = performanceData.reduce(
        (sum, p) => sum + (p.views || 0),
        0
      );
      const totalClicks = performanceData.reduce(
        (sum, p) => sum + (p.clicks || 0),
        0
      );
      const totalConversions = performanceData.reduce(
        (sum, p) => sum + (p.conversions || 0),
        0
      );
      const totalEarnings = performanceData.reduce(
        (sum, p) => sum + (p.revenue || 0),
        0
      );

      const clickThroughRate =
        totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
      const conversionRate =
        totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const earningsPerCampaign =
        completedCampaigns > 0 ? totalEarnings / completedCampaigns : 0;
      const viewsPerCampaign =
        completedCampaigns > 0 ? totalViews / completedCampaigns : 0;

      // Get average rating
      const { data: profileData } = await this.supabase
        .from('promoter_profiles')
        .select('rating')
        .eq('user_id', promoterId)
        .single();

      const metrics: PerformanceMetrics = {
        promoter_id: promoterId,
        period,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        campaigns_completed: completedCampaigns,
        total_earnings: totalEarnings,
        avg_rating: profileData?.rating || 0,
        total_views: totalViews,
        total_clicks: totalClicks,
        total_conversions: totalConversions,
        click_through_rate: clickThroughRate,
        conversion_rate: conversionRate,
        earnings_per_campaign: earningsPerCampaign,
        views_per_campaign: viewsPerCampaign,
      };

      return { metrics, error: null };
    } catch (error) {
      return { metrics: null, error: 'Failed to fetch performance metrics' };
    }
  }

  async getTimeBasedInsights(
    promoterId: string
  ): Promise<{ insights: TimeBasedInsight[] | null; error: string | null }> {
    try {
      const insights: TimeBasedInsight[] = [];

      // Get hourly performance data for peak hours analysis
      const { data: hourlyData } = await this.supabase
        .from('campaign_analytics')
        .select('clicks, created_at')
        .eq('promoter_id', promoterId)
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        );

      if (hourlyData && hourlyData.length > 0) {
        // Analyze peak hours
        const hourlyClicks: Record<number, number> = {};

        hourlyData.forEach((record: any) => {
          const hour = new Date(record.created_at).getHours();
          hourlyClicks[hour] = (hourlyClicks[hour] || 0) + (record.clicks || 0);
        });

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const clicksByHour = hours.map(hour => hourlyClicks[hour] || 0);
        const peakHour = clicksByHour.indexOf(Math.max(...clicksByHour));

        const peakHoursInsight: TimeBasedInsight = {
          insight_type: 'peak_hours',
          title: 'Peak Performance Hours',
          description: `Your content performs best at ${peakHour}:00`,
          data: {
            labels: hours.map(h => `${h}:00`),
            values: clicksByHour,
            recommendation: `Schedule your posts around ${peakHour}:00 for maximum engagement`,
            confidence_score: 0.8,
          },
          actionable_tips: [
            `Post content between ${peakHour - 1}:00 and ${peakHour + 1}:00`,
            'Monitor engagement patterns for seasonal changes',
            'Consider your audience timezone when posting',
          ],
        };

        insights.push(peakHoursInsight);
      }

      // Analyze best days of the week
      const { data: weeklyData } = await this.supabase
        .from('campaign_analytics')
        .select('clicks, conversions, created_at')
        .eq('promoter_id', promoterId)
        .gte(
          'created_at',
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        );

      if (weeklyData && weeklyData.length > 0) {
        const dailyPerformance: Record<
          number,
          { clicks: number; conversions: number }
        > = {};

        weeklyData.forEach((record: any) => {
          const dayOfWeek = new Date(record.created_at).getDay();
          if (!dailyPerformance[dayOfWeek]) {
            dailyPerformance[dayOfWeek] = { clicks: 0, conversions: 0 };
          }
          dailyPerformance[dayOfWeek].clicks += record.clicks || 0;
          dailyPerformance[dayOfWeek].conversions += record.conversions || 0;
        });

        const days = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ];
        const conversionsByDay = days.map(
          (_, index) => dailyPerformance[index]?.conversions || 0
        );

        const bestDayIndex = conversionsByDay.indexOf(
          Math.max(...conversionsByDay)
        );

        const bestDaysInsight: TimeBasedInsight = {
          insight_type: 'best_days',
          title: 'Best Days to Promote',
          description: `${days[bestDayIndex]} shows the highest conversion rates`,
          data: {
            labels: days,
            values: conversionsByDay,
            recommendation: `Focus your promotional activities on ${days[bestDayIndex]}s`,
            confidence_score: 0.75,
          },
          actionable_tips: [
            `Plan major campaigns to launch on ${days[bestDayIndex]}`,
            'Reduce activity on low-performing days',
            'Test different content types on different days',
          ],
        };

        insights.push(bestDaysInsight);
      }

      return { insights, error: null };
    } catch (error) {
      return {
        insights: null,
        error: 'Failed to generate time-based insights',
      };
    }
  }

  async getPerformanceComparison(
    promoterId: string,
    currentPeriod: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<{
    comparisons: PerformanceComparison[] | null;
    error: string | null;
  }> {
    try {
      const endDate = new Date();
      const currentStart = this.getStartDate(endDate, currentPeriod);

      const previousEnd = new Date(currentStart);
      previousEnd.setDate(previousEnd.getDate() - 1);
      const previousStart = this.getStartDate(previousEnd, currentPeriod);

      const [currentMetrics, previousMetrics] = await Promise.all([
        this.getPerformanceMetrics(
          promoterId,
          currentPeriod,
          currentStart.toISOString(),
          endDate.toISOString()
        ),
        this.getPerformanceMetrics(
          promoterId,
          currentPeriod,
          previousStart.toISOString(),
          previousEnd.toISOString()
        ),
      ]);

      if (currentMetrics.error || previousMetrics.error) {
        return {
          comparisons: null,
          error: currentMetrics.error || previousMetrics.error,
        };
      }

      const current = currentMetrics.metrics!;
      const previous = previousMetrics.metrics!;

      const comparisons: PerformanceComparison[] = [
        {
          metric: 'Total Earnings',
          current_period: current.total_earnings,
          previous_period: previous.total_earnings,
          change_percentage: this.calculatePercentageChange(
            previous.total_earnings,
            current.total_earnings
          ),
          trend: this.getTrend(previous.total_earnings, current.total_earnings),
          benchmark: 1000,
          percentile_rank: 65,
        },
        {
          metric: 'Click-Through Rate',
          current_period: current.click_through_rate,
          previous_period: previous.click_through_rate,
          change_percentage: this.calculatePercentageChange(
            previous.click_through_rate,
            current.click_through_rate
          ),
          trend: this.getTrend(
            previous.click_through_rate,
            current.click_through_rate
          ),
          benchmark: 2.5,
          percentile_rank: 70,
        },
        {
          metric: 'Conversion Rate',
          current_period: current.conversion_rate,
          previous_period: previous.conversion_rate,
          change_percentage: this.calculatePercentageChange(
            previous.conversion_rate,
            current.conversion_rate
          ),
          trend: this.getTrend(
            previous.conversion_rate,
            current.conversion_rate
          ),
          benchmark: 3.2,
          percentile_rank: 58,
        },
        {
          metric: 'Campaigns Completed',
          current_period: current.campaigns_completed,
          previous_period: previous.campaigns_completed,
          change_percentage: this.calculatePercentageChange(
            previous.campaigns_completed,
            current.campaigns_completed
          ),
          trend: this.getTrend(
            previous.campaigns_completed,
            current.campaigns_completed
          ),
          benchmark: 5,
          percentile_rank: 75,
        },
      ];

      return { comparisons, error: null };
    } catch (error) {
      return {
        comparisons: null,
        error: 'Failed to generate performance comparison',
      };
    }
  }

  async generatePersonalizedInsights(
    promoterId: string
  ): Promise<{ insights: PromoterInsight[] | null; error: string | null }> {
    try {
      const insights: PromoterInsight[] = [];

      // Get recent performance data
      const { metrics } = await this.getPerformanceMetrics(promoterId, 'month');
      const { comparisons } = await this.getPerformanceComparison(
        promoterId,
        'month'
      );

      if (!metrics || !comparisons) {
        return { insights, error: null };
      }

      // Generate insights based on performance patterns

      // 1. Performance Trend Insight
      const earningsComparison = comparisons.find(
        c => c.metric === 'Total Earnings'
      );
      if (earningsComparison && earningsComparison.change_percentage > 20) {
        insights.push({
          id: `trend_${promoterId}_${Date.now()}`,
          promoter_id: promoterId,
          insight_type: 'performance_trend',
          title: 'Strong Earnings Growth',
          description: `Your earnings have increased by ${earningsComparison.change_percentage.toFixed(1)}% this month!`,
          priority: 'high',
          data: {
            change_percentage: earningsComparison.change_percentage,
            current_earnings: earningsComparison.current_period,
          },
          actionable_recommendations: [
            'Continue focusing on the campaign types that are working well',
            'Consider increasing your rates for future campaigns',
            'Document what strategies led to this success',
          ],
          generated_at: new Date().toISOString(),
        });
      }

      // 2. Optimization Opportunity
      const ctrComparison = comparisons.find(
        c => c.metric === 'Click-Through Rate'
      );
      if (
        ctrComparison &&
        ctrComparison.current_period < ctrComparison.benchmark
      ) {
        insights.push({
          id: `optimization_${promoterId}_${Date.now()}`,
          promoter_id: promoterId,
          insight_type: 'optimization',
          title: 'Click-Through Rate Optimization',
          description:
            "Your CTR is below industry benchmark. There's room for improvement.",
          priority: 'medium',
          data: {
            current_ctr: ctrComparison.current_period,
            benchmark: ctrComparison.benchmark,
            gap: ctrComparison.benchmark - ctrComparison.current_period,
          },
          actionable_recommendations: [
            'A/B test different call-to-action phrases',
            'Use more compelling visuals in your content',
            'Post at peak engagement hours for your audience',
            'Include urgency or scarcity elements in your messaging',
          ],
          generated_at: new Date().toISOString(),
        });
      }

      // 3. Opportunity Insight
      if (metrics.campaigns_completed < 3) {
        insights.push({
          id: `opportunity_${promoterId}_${Date.now()}`,
          promoter_id: promoterId,
          insight_type: 'opportunity',
          title: 'Campaign Volume Opportunity',
          description:
            'You could increase your earnings by taking on more campaigns.',
          priority: 'medium',
          data: {
            current_campaigns: metrics.campaigns_completed,
            potential_earnings: metrics.earnings_per_campaign * 2,
          },
          actionable_recommendations: [
            'Apply to 2-3 more campaigns this month',
            'Improve your profile to attract more invitations',
            'Focus on campaigns in your specialty niches',
            'Build relationships with creators for repeat opportunities',
          ],
          generated_at: new Date().toISOString(),
        });
      }

      // Save insights to database
      if (insights.length > 0) {
        const { error: saveError } = await this.supabase
          .from('promoter_insights')
          .upsert(
            insights.map(insight => ({
              promoter_id: insight.promoter_id,
              insight_type: insight.insight_type,
              data: {
                title: insight.title,
                description: insight.description,
                priority: insight.priority,
                actionable_recommendations: insight.actionable_recommendations,
                data: insight.data,
              },
              generated_at: insight.generated_at,
            })),
            { onConflict: 'promoter_id,insight_type' }
          );

        if (saveError) {
          console.warn('Failed to save insights:', saveError.message);
        }
      }

      return { insights, error: null };
    } catch (error) {
      return {
        insights: null,
        error: 'Failed to generate personalized insights',
      };
    }
  }

  private getStartDate(
    endDate: Date,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): Date {
    const start = new Date(endDate);

    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return start;
  }

  private calculatePercentageChange(
    oldValue: number,
    newValue: number
  ): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private getTrend(
    oldValue: number,
    newValue: number
  ): 'up' | 'down' | 'stable' {
    const change = this.calculatePercentageChange(oldValue, newValue);
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  }
}
