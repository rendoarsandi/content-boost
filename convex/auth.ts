import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Authentication and social account management
export const createSocialAccount = mutation({
  args: {
    userId: v.id("users"),
    provider: v.union(v.literal("tiktok"), v.literal("instagram"), v.literal("youtube")),
    providerId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.object({
      username: v.optional(v.string()),
      followers: v.optional(v.number()),
      verified: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    // Check if this social account is already connected
    const existingAccount = await ctx.db
      .query("socialAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("provider"), args.provider),
          q.eq(q.field("providerId"), args.providerId)
        )
      )
      .first();

    if (existingAccount) {
      throw new Error("This social account is already connected to another user");
    }

    return await ctx.db.insert("socialAccounts", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getSocialAccountsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("socialAccounts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});

export const updateSocialAccountToken = mutation({
  args: {
    id: v.id("socialAccounts"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const disconnectSocialAccount = mutation({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

export const getSocialAccountByProvider = query({
  args: {
    userId: v.id("users"),
    provider: v.union(v.literal("tiktok"), v.literal("instagram"), v.literal("youtube")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("socialAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("provider"), args.provider)
        )
      )
      .first();
  },
});