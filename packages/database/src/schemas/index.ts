// Supabase table definitions for compatibility with existing code
// These are mock schemas since we're using Supabase instead of Drizzle ORM

export const users = {
  id: 'id',
  email: 'email',
  banned: 'banned',
  role: 'role',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export const campaigns = {
  id: 'id',
  title: 'title',
  description: 'description',
  status: 'status',
  creatorId: 'creator_id',
  budget: 'budget',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export const transactions = {
  id: 'id',
  amount: 'amount',
  status: 'status',
  type: 'type',
  userId: 'user_id',
  createdAt: 'created_at',
};

export const applications = {
  id: 'id',
  campaignId: 'campaign_id',
  promoterId: 'promoter_id',
  status: 'status',
  createdAt: 'created_at',
};

export const payouts = {
  id: 'id',
  amount: 'amount',
  status: 'status',
  userId: 'user_id',
  createdAt: 'created_at',
};

export const platformRevenue = {
  id: 'id',
  amount: 'amount',
  source: 'source',
  createdAt: 'created_at',
};

export const promoterProfiles = {
  id: 'id',
  user_id: 'user_id',
  bio: 'bio',
  niche: 'niche',
  portfolio_links: 'portfolio_links',
  tier: 'tier',
  created_at: 'created_at',
  updated_at: 'updated_at',
};

export const badges = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon_url: 'icon_url',
  created_at: 'created_at',
};

export const userAchievements = {
  id: 'id',
  user_id: 'user_id',
  badge_id: 'badge_id',
  created_at: 'created_at',
};

export const conversations = {
  id: 'id',
  created_at: 'created_at',
};

export const messages = {
  id: 'id',
  conversation_id: 'conversation_id',
  sender_id: 'sender_id',
  content: 'content',
  created_at: 'created_at',
};

export const participants = {
  id: 'id',
  conversation_id: 'conversation_id',
  user_id: 'user_id',
};

export const abTests = {
  id: 'id',
  campaign_id: 'campaign_id',
  name: 'name',
  description: 'description',
  variants: 'variants',
  status: 'status',
  start_date: 'start_date',
  end_date: 'end_date',
  winner_variant_id: 'winner_variant_id',
  created_at: 'created_at',
  updated_at: 'updated_at',
};

export const abTestVariants = {
  id: 'id',
  test_id: 'test_id',
  name: 'name',
  description: 'description',
  config: 'config',
  traffic_percentage: 'traffic_percentage',
  created_at: 'created_at',
};

export const abTestMetrics = {
  id: 'id',
  test_id: 'test_id',
  variant_id: 'variant_id',
  metric_type: 'metric_type',
  value: 'value',
  recorded_at: 'recorded_at',
};

export const campaignTemplates = {
  id: 'id',
  name: 'name',
  description: 'description',
  category: 'category',
  template_config: 'template_config',
  preview_image: 'preview_image',
  created_at: 'created_at',
  updated_at: 'updated_at',
};

export const promoterRecommendations = {
  id: 'id',
  creator_id: 'creator_id',
  promoter_id: 'promoter_id',
  campaign_id: 'campaign_id',
  score: 'score',
  factors: 'factors',
  created_at: 'created_at',
};

export const promoterInsights = {
  id: 'id',
  promoter_id: 'promoter_id',
  insight_type: 'insight_type',
  data: 'data',
  generated_at: 'generated_at',
};
