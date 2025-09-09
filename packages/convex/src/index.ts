// Export Convex client utilities
export { ConvexProvider, ConvexReactClient } from "convex/react";

// Convex hooks re-exports
export { 
  useQuery, 
  useMutation, 
  useAction,
  usePaginatedQuery,
  useConvex
} from "convex/react";

// Note: API and functions will be imported directly from the convex folder
// when using Convex in applications