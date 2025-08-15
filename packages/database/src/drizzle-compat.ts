// Compatibility layer for Drizzle ORM functions when using Supabase
// This allows existing tests to continue working during the migration

export const eq = (column: string, value: any) => ({
  column,
  value,
  operator: 'eq',
});
export const and = (...conditions: any[]) => ({ type: 'and', conditions });
export const or = (...conditions: any[]) => ({ type: 'or', conditions });
export const gt = (column: string, value: any) => ({
  column,
  value,
  operator: 'gt',
});
export const lt = (column: string, value: any) => ({
  column,
  value,
  operator: 'lt',
});
export const gte = (column: string, value: any) => ({
  column,
  value,
  operator: 'gte',
});
export const lte = (column: string, value: any) => ({
  column,
  value,
  operator: 'lte',
});
export const isNull = (column: string) => ({
  column,
  value: null,
  operator: 'is',
});
export const isNotNull = (column: string) => ({
  column,
  value: null,
  operator: 'not.is',
});
