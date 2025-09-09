interface PromoterProfile {
  id: string;
  user_id: string;
  bio: string;
  niche: string[];
  portfolio_links: string[];
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  followers_count?: number;
  engagement_rate?: number;
  avg_views?: number;
  rating?: number;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    role: string;
  };
}
interface RecommendationFilters {
  niche?: string[];
  tier?: string[];
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  maxEngagementRate?: number;
  minRating?: number;
  maxViews?: number;
  minViews?: number;
  location?: string;
  languages?: string[];
}
interface PromoterRecommendation {
  id: string;
  creator_id: string;
  promoter_id: string;
  campaign_id?: string;
  score: number;
  factors: {
    niche_match: number;
    engagement_rate: number;
    follower_count: number;
    past_performance: number;
    tier_bonus: number;
  };
  created_at: string;
  promoter?: PromoterProfile;
}
interface CampaignAnalytics {
  campaign_id: string;
  promoter_id: string;
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  conversion_rate: number;
  roi: number;
}
export declare class PromoterRecommendationService {
  private supabase;
  constructor(supabaseUrl: string, supabaseKey: string);
  getFilteredPromoters(
    filters: RecommendationFilters,
    limit?: number
  ): Promise<{
    promoters: PromoterProfile[] | null;
    error: string | null;
  }>;
  generateRecommendations(
    creatorId: string,
    campaignId?: string,
    limit?: number
  ): Promise<{
    recommendations: PromoterRecommendation[] | null;
    error: string | null;
  }>;
  private calculateRecommendationScore;
  getPromoterAnalytics(
    promoterId: string,
    dateRange?: {
      start: string;
      end: string;
    }
  ): Promise<{
    analytics: CampaignAnalytics[] | null;
    error: string | null;
  }>;
  getSimilarPromoters(
    promoterId: string,
    limit?: number
  ): Promise<{
    promoters: PromoterProfile[] | null;
    error: string | null;
  }>;
  updatePromoterMetrics(
    promoterId: string,
    metrics: Partial<PromoterProfile>
  ): Promise<{
    success: boolean;
    error: string | null;
  }>;
}
export {};
//# sourceMappingURL=promoter-recommendations.d.ts.map
