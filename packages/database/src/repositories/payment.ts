import { supabase } from '@repo/config/supabase';
import { PaginationOptions } from './base';

// Mock-up interfaces
export interface Payout {
  id: string;
  promoterId: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  processedAt?: string;
}

export interface PlatformRevenue {
  id: string;
  campaignId: string;
  amount: number;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  promoterId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  processedAt?: string;
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

export const payoutRepository = {
  async findById(id: string) {
    return supabase.from('payouts').select('*').eq('id', id).single();
  },
  async create(data: Omit<Payout, 'id' | 'createdAt'>) {
    return supabase.from('payouts').insert(data).select().single();
  },
  async update(id: string, data: Partial<Omit<Payout, 'id'>>) {
    return supabase.from('payouts').update(data).eq('id', id).select().single();
  },
  async delete(id: string) {
    return supabase.from('payouts').delete().eq('id', id);
  },
  async findAll(options: PaginationOptions = {}) {
    let query = supabase.from('payouts').select('*');
    return applyQueryOptions(query, options);
  },
};

export const platformRevenueRepository = {
  async findById(id: string) {
    return supabase.from('platform_revenue').select('*').eq('id', id).single();
  },
  async create(data: Omit<PlatformRevenue, 'id' | 'createdAt'>) {
    return supabase.from('platform_revenue').insert(data).select().single();
  },
  async update(id: string, data: Partial<Omit<PlatformRevenue, 'id'>>) {
    return supabase
      .from('platform_revenue')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },
  async delete(id: string) {
    return supabase.from('platform_revenue').delete().eq('id', id);
  },
  async findAll(options: PaginationOptions = {}) {
    let query = supabase.from('platform_revenue').select('*');
    return applyQueryOptions(query, options);
  },
};

export const withdrawalRepository = {
  async findById(id: string) {
    return supabase.from('withdrawals').select('*').eq('id', id).single();
  },
  async create(data: Omit<Withdrawal, 'id' | 'requestedAt'>) {
    return supabase.from('withdrawals').insert(data).select().single();
  },
  async update(id: string, data: Partial<Omit<Withdrawal, 'id'>>) {
    return supabase
      .from('withdrawals')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },
  async delete(id: string) {
    return supabase.from('withdrawals').delete().eq('id', id);
  },
  async findAll(options: PaginationOptions = {}) {
    let query = supabase.from('withdrawals').select('*');
    return applyQueryOptions(query, { ...options, orderBy: 'requestedAt' });
  },
};
