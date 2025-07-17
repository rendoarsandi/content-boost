// Cache type definitions
export interface CacheEntry<T = any> {
  value: T;
  ttl: number;
  createdAt: Date;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
}