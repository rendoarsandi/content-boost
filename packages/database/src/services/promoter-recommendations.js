'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PromoterRecommendationService = void 0;
const supabase_js_1 = require('@supabase/supabase-js');
class PromoterRecommendationService {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
  }
  async getFilteredPromoters(filters, limit = 50) {
    try {
      let query = this.supabase.from('promoter_profiles').select(`
          id,
          user_id,
          bio,
          niche,
          portfolio_links,
          tier,
          followers_count,
          engagement_rate,
          avg_views,
          rating,
          created_at,
          updated_at,
          users (
            email,
            role
          )
        `);
      // Apply filters
      if (filters.niche && filters.niche.length > 0) {
        query = query.contains('niche', filters.niche);
      }
      if (filters.tier && filters.tier.length > 0) {
        query = query.in('tier', filters.tier);
      }
      if (filters.minFollowers !== undefined) {
        query = query.gte('followers_count', filters.minFollowers);
      }
      if (filters.maxFollowers !== undefined) {
        query = query.lte('followers_count', filters.maxFollowers);
      }
      if (filters.minEngagementRate !== undefined) {
        query = query.gte('engagement_rate', filters.minEngagementRate);
      }
      if (filters.maxEngagementRate !== undefined) {
        query = query.lte('engagement_rate', filters.maxEngagementRate);
      }
      if (filters.minRating !== undefined) {
        query = query.gte('rating', filters.minRating);
      }
      if (filters.minViews !== undefined) {
        query = query.gte('avg_views', filters.minViews);
      }
      if (filters.maxViews !== undefined) {
        query = query.lte('avg_views', filters.maxViews);
      }
      const { data, error } = await query
        .order('rating', { ascending: false })
        .limit(limit);
      if (error) {
        return { promoters: null, error: error.message };
      }
      const promoters =
        data?.map(item => ({
          ...item,
          user: item.users,
        })) || [];
      return { promoters, error: null };
    } catch (error) {
      return { promoters: null, error: 'Failed to fetch filtered promoters' };
    }
  }
  async generateRecommendations(creatorId, campaignId, limit = 20) {
    try {
      // Get campaign details if provided
      let campaignNiche = [];
      let campaignBudget = 0;
      if (campaignId) {
        const { data: campaign } = await this.supabase
          .from('campaigns')
          .select('niche, budget')
          .eq('id', campaignId)
          .single();
        if (campaign) {
          campaignNiche = campaign.niche || [];
          campaignBudget = campaign.budget || 0;
        }
      }
      // Get all promoters with their performance metrics
      const { data: promoters, error: promotersError } = await this.supabase
        .from('promoter_profiles')
        .select(
          `
          id,
          user_id,
          bio,
          niche,
          portfolio_links,
          tier,
          followers_count,
          engagement_rate,
          avg_views,
          rating,
          created_at,
          updated_at,
          users (
            email,
            role
          )
        `
        )
        .eq('users.role', 'promoter');
      if (promotersError) {
        return { recommendations: null, error: promotersError.message };
      }
      // Calculate recommendation scores
      const recommendations = [];
      for (const promoter of promoters || []) {
        const score = await this.calculateRecommendationScore(
          promoter,
          campaignNiche,
          campaignBudget,
          creatorId
        );
        if (score.total > 0.3) {
          // Minimum threshold
          recommendations.push({
            id: `${creatorId}-${promoter.id}-${Date.now()}`,
            creator_id: creatorId,
            promoter_id: promoter.id,
            campaign_id: campaignId,
            score: score.total,
            factors: score.factors,
            created_at: new Date().toISOString(),
            promoter: {
              ...promoter,
              user: promoter.users,
            },
          });
        }
      }
      // Sort by score and limit results
      recommendations.sort((a, b) => b.score - a.score);
      const topRecommendations = recommendations.slice(0, limit);
      // Save recommendations to database
      if (topRecommendations.length > 0) {
        const { error: saveError } = await this.supabase
          .from('promoter_recommendations')
          .upsert(
            topRecommendations.map(rec => ({
              id: rec.id,
              creator_id: rec.creator_id,
              promoter_id: rec.promoter_id,
              campaign_id: rec.campaign_id,
              score: rec.score,
              factors: rec.factors,
            })),
            { onConflict: 'creator_id,promoter_id,campaign_id' }
          );
        if (saveError) {
          console.warn('Failed to save recommendations:', saveError.message);
        }
      }
      return { recommendations: topRecommendations, error: null };
    } catch (error) {
      return {
        recommendations: null,
        error: 'Failed to generate recommendations',
      };
    }
  }
  async calculateRecommendationScore(
    promoter,
    campaignNiche,
    campaignBudget,
    creatorId
  ) {
    let nicheMatchScore = 0;
    let engagementScore = 0;
    let followerScore = 0;
    let performanceScore = 0;
    let tierBonus = 0;
    // Niche matching (0-1)
    if (campaignNiche.length > 0 && promoter.niche?.length > 0) {
      const matches = promoter.niche.filter(niche =>
        campaignNiche.includes(niche)
      ).length;
      nicheMatchScore =
        matches / Math.max(campaignNiche.length, promoter.niche.length);
    } else {
      nicheMatchScore = 0.5; // neutral if no niche data
    }
    // Engagement rate scoring (0-1)
    if (promoter.engagement_rate) {
      engagementScore = Math.min(promoter.engagement_rate / 10, 1); // cap at 10%
    }
    // Follower count scoring (0-1, logarithmic scale)
    if (promoter.followers_count) {
      followerScore = Math.min(Math.log10(promoter.followers_count) / 6, 1); // cap at 1M followers
    }
    // Past performance with this creator
    const { data: pastCampaigns } = await this.supabase
      .from('applications')
      .select('campaign_id, campaigns!inner(creator_id)')
      .eq('promoter_id', promoter.id)
      .eq('campaigns.creator_id', creatorId)
      .eq('status', 'approved');
    if (pastCampaigns && pastCampaigns.length > 0) {
      // Get performance metrics for past campaigns
      const campaignIds = pastCampaigns.map(c => c.campaign_id);
      const { data: analytics } = await this.supabase
        .from('campaign_analytics')
        .select('roi, conversion_rate')
        .in('campaign_id', campaignIds)
        .eq('promoter_id', promoter.id);
      if (analytics && analytics.length > 0) {
        const avgROI =
          analytics.reduce((sum, a) => sum + (a.roi || 0), 0) /
          analytics.length;
        const avgConversionRate =
          analytics.reduce((sum, a) => sum + (a.conversion_rate || 0), 0) /
          analytics.length;
        performanceScore = Math.min((avgROI + avgConversionRate) / 20, 1); // normalize
      }
    }
    // Tier bonus
    const tierMultipliers = {
      bronze: 0.1,
      silver: 0.2,
      gold: 0.3,
      platinum: 0.4,
    };
    tierBonus = tierMultipliers[promoter.tier] || 0;
    // Weight the factors
    const weights = {
      niche_match: 0.3,
      engagement_rate: 0.25,
      follower_count: 0.2,
      past_performance: 0.15,
      tier_bonus: 0.1,
    };
    const factors = {
      niche_match: nicheMatchScore,
      engagement_rate: engagementScore,
      follower_count: followerScore,
      past_performance: performanceScore,
      tier_bonus: tierBonus,
    };
    const total =
      factors.niche_match * weights.niche_match +
      factors.engagement_rate * weights.engagement_rate +
      factors.follower_count * weights.follower_count +
      factors.past_performance * weights.past_performance +
      factors.tier_bonus * weights.tier_bonus;
    return { factors, total };
  }
  async getPromoterAnalytics(promoterId, dateRange) {
    try {
      let query = this.supabase
        .from('campaign_analytics')
        .select('*')
        .eq('promoter_id', promoterId);
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }
      const { data, error } = await query.order('created_at', {
        ascending: false,
      });
      if (error) {
        return { analytics: null, error: error.message };
      }
      return { analytics: data || [], error: null };
    } catch (error) {
      return { analytics: null, error: 'Failed to fetch promoter analytics' };
    }
  }
  async getSimilarPromoters(promoterId, limit = 10) {
    try {
      // Get the target promoter's profile
      const { data: targetPromoter, error: targetError } = await this.supabase
        .from('promoter_profiles')
        .select('*')
        .eq('id', promoterId)
        .single();
      if (targetError) {
        return { promoters: null, error: targetError.message };
      }
      // Find similar promoters based on niche, tier, and metrics
      const { data, error } = await this.supabase
        .from('promoter_profiles')
        .select(
          `
          id,
          user_id,
          bio,
          niche,
          portfolio_links,
          tier,
          followers_count,
          engagement_rate,
          avg_views,
          rating,
          created_at,
          updated_at,
          users (
            email,
            role
          )
        `
        )
        .neq('id', promoterId)
        .contains('niche', targetPromoter.niche)
        .eq('tier', targetPromoter.tier)
        .order('rating', { ascending: false })
        .limit(limit);
      if (error) {
        return { promoters: null, error: error.message };
      }
      const promoters =
        data?.map(item => ({
          ...item,
          user: item.users,
        })) || [];
      return { promoters, error: null };
    } catch (error) {
      return { promoters: null, error: 'Failed to fetch similar promoters' };
    }
  }
  async updatePromoterMetrics(promoterId, metrics) {
    try {
      const { error } = await this.supabase
        .from('promoter_profiles')
        .update({
          ...metrics,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promoterId);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: 'Failed to update promoter metrics' };
    }
  }
}
exports.PromoterRecommendationService = PromoterRecommendationService;
//# sourceMappingURL=promoter-recommendations.js.map
