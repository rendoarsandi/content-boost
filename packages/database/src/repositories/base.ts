// Common database types and interfaces can be defined here.

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// The BaseRepository class and transaction logic are removed
// as Supabase client is used directly in each repository.
