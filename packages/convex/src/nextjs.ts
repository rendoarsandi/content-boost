// Next.js specific Convex utilities
import { ConvexHttpClient } from "convex/browser";

// Server-side Convex client for API routes
export function createConvexClient() {
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is not set");
  }
  
  return new ConvexHttpClient(convexUrl);
}

// Helper function for API routes
export async function withConvex<T>(
  handler: (convex: ConvexHttpClient) => Promise<T>
): Promise<T> {
  const convex = createConvexClient();
  return await handler(convex);
}