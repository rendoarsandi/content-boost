import { supabase } from '@repo/config/supabase';
import { PaginationOptions } from './base';

// Mock-up interfaces based on Prisma schema
export interface Campaign {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  budget: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface CampaignMaterial {
  id: string;
  campaignId: string;
  type: 'IMAGE' | 'VIDEO' | 'TEXT';
  url: string;
  createdAt: string;
}

export interface CampaignApplication {
  id: string;
  campaignId: string;
  promoterId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: string;
}

// Helper for pagination and ordering
const applyQueryOptions = (query: any, options: PaginationOptions) => {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'createdAt',
    orderDirection = 'desc',
  } = options;
  return query
    .range(offset, offset + limit - 1)
    .order(orderBy, { ascending: orderDirection === 'asc' });
};

export const campaignRepository = {
  async findById(id: string) {
    return supabase.from('campaigns').select('*').eq('id', id).single();
  },

  async findByCreatorId(creatorId: string, options: PaginationOptions = {}) {
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('creatorId', creatorId);
    return applyQueryOptions(query, options);
  },

  async findByStatus(
    status: Campaign['status'],
    options: PaginationOptions = {}
  ) {
    let query = supabase.from('campaigns').select('*').eq('status', status);
    return applyQueryOptions(query, options);
  },

  async create(data: Omit<Campaign, 'id' | 'createdAt'>) {
    return supabase.from('campaigns').insert(data).select().single();
  },

  async update(id: string, data: Partial<Omit<Campaign, 'id'>>) {
    return supabase
      .from('campaigns')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },

  async delete(id: string) {
    return supabase.from('campaigns').delete().eq('id', id);
  },

  async findAll(options: PaginationOptions = {}) {
    let query = supabase.from('campaigns').select('*');
    return applyQueryOptions(query, options);
  },

  async findActiveCampaigns() {
    const now = new Date().toISOString();
    return supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'ACTIVE')
      .lte('startDate', now)
      .gte('endDate', now)
      .order('createdAt', { ascending: false });
  },
};

export const campaignMaterialRepository = {
  async findById(id: string) {
    return supabase
      .from('campaign_materials')
      .select('*')
      .eq('id', id)
      .single();
  },
  async create(data: Omit<CampaignMaterial, 'id' | 'createdAt'>) {
    return supabase.from('campaign_materials').insert(data).select().single();
  },
  async update(id: string, data: Partial<Omit<CampaignMaterial, 'id'>>) {
    return supabase
      .from('campaign_materials')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },
  async delete(id: string) {
    return supabase.from('campaign_materials').delete().eq('id', id);
  },
};

export const campaignApplicationRepository = {
  async findById(id: string) {
    return supabase
      .from('campaign_applications')
      .select('*')
      .eq('id', id)
      .single();
  },
  async create(data: Omit<CampaignApplication, 'id' | 'appliedAt'>) {
    return supabase
      .from('campaign_applications')
      .insert(data)
      .select()
      .single();
  },
  async update(id: string, data: Partial<Omit<CampaignApplication, 'id'>>) {
    return supabase
      .from('campaign_applications')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },
  async delete(id: string) {
    return supabase.from('campaign_applications').delete().eq('id', id);
  },
};
