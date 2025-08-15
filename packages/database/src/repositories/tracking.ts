import { supabase } from '@repo/config/supabase';
import { PaginationOptions } from './base';

// Mock-up interfaces
export interface ViewRecord {
  id: string;
  trackingSessionId: string;
  timestamp: string;
  metadata: Record<string, any>; // JSON field
}

export interface TrackingSession {
  id: string;
  campaignId: string;
  promoterId: string;
  startTime: string;
  endTime?: string;
  ipAddress?: string;
  userAgent?: string;
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

export const viewRecordRepository = {
  async findById(id: string) {
    return supabase.from('view_records').select('*').eq('id', id).single();
  },
  async create(data: Omit<ViewRecord, 'id'>) {
    return supabase.from('view_records').insert(data).select().single();
  },
  async update(id: string, data: Partial<Omit<ViewRecord, 'id'>>) {
    return supabase
      .from('view_records')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },
  async delete(id: string) {
    return supabase.from('view_records').delete().eq('id', id);
  },
  async findAll(options: PaginationOptions = {}) {
    let query = supabase.from('view_records').select('*');
    return applyQueryOptions(query, { ...options, orderBy: 'timestamp' });
  },
};

export const trackingSessionRepository = {
  async findById(id: string) {
    return supabase.from('tracking_sessions').select('*').eq('id', id).single();
  },
  async create(data: Omit<TrackingSession, 'id'>) {
    return supabase.from('tracking_sessions').insert(data).select().single();
  },
  async update(id: string, data: Partial<Omit<TrackingSession, 'id'>>) {
    return supabase
      .from('tracking_sessions')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },
  async delete(id: string) {
    return supabase.from('tracking_sessions').delete().eq('id', id);
  },
  async findAll(options: PaginationOptions = {}) {
    let query = supabase.from('tracking_sessions').select('*');
    return applyQueryOptions(query, { ...options, orderBy: 'startTime' });
  },
};
