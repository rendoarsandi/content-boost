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
