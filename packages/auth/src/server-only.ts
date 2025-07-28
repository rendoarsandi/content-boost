import "server-only";
import { auth } from "./config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Export auth for use in API routes
export { auth };

// Server-side session utilities
export const getSession = async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
};

export const getCurrentUser = async () => {
  const session = await getSession();
  return session?.user || null;
};

// Authentication guards
export const requireAuth = async () => {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  return session;
};

export const requireRole = async (requiredRole: "creator" | "promoter" | "admin") => {
  const session = await requireAuth();
  
  // For now, we'll skip role checking until we properly implement user roles
  // if (session.user.role !== requiredRole) {
  //   redirect("/unauthorized");
  // }
  
  return session;
};

export const requireAnyRole = async (roles: ("creator" | "promoter" | "admin")[]) => {
  const session = await requireAuth();
  
  // For now, we'll skip role checking until we properly implement user roles
  // if (!roles.includes(session.user.role as any)) {
  //   redirect("/unauthorized");
  // }
  
  return session;
};

// Admin guard
export const requireAdmin = async () => {
  return await requireRole("admin");
};

// Creator guard
export const requireCreator = async () => {
  return await requireRole("creator");
};

// Promoter guard
export const requirePromoter = async () => {
  return await requireRole("promoter");
};

// Social account utilities
export const getSocialAccounts = async (userId: string) => {
  try {
    const { db, socialAccounts } = await import("@repo/database");
    const { eq } = await import("drizzle-orm");
    
    const accounts = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, userId));
    
    return accounts || [];
  } catch (error) {
    console.error("Error fetching social accounts:", error);
    return [];
  }
};

export const getSocialAccount = async (userId: string, provider: "tiktok" | "instagram") => {
  const accounts = await getSocialAccounts(userId);
  return accounts.find((account: any) => account.platform === provider);
};

export const hasSocialAccount = async (userId: string, provider: "tiktok" | "instagram") => {
  const account = await getSocialAccount(userId, provider);
  return !!account;
};

// Token management using OAuth handlers
export const getAccessToken = async (userId: string, provider: "tiktok" | "instagram") => {
  // Note: Token management should be implemented with external database access
  throw new Error("getAccessToken requires external implementation");
};

export const refreshToken = async (userId: string, provider: "tiktok" | "instagram") => {
  // Note: Token refresh should be implemented with external database access
  throw new Error("refreshToken requires external implementation");
};