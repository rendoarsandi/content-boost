import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Promoter profile management
export const createPromoterProfile = mutation({
  args: {
    userId: v.id("users"),
    bio: v.optional(v.string()),
    niche: v.optional(v.string()),
    portfolioLinks: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promoterProfiles", {
      ...args,
      tier: "bronze",
      totalViews: 0,
      totalEarnings: 0,
      rating: 0,
      completedCampaigns: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getPromoterProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promoterProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
  },
});

export const updatePromoterProfile = mutation({
  args: {
    userId: v.id("users"),
    bio: v.optional(v.string()),
    niche: v.optional(v.string()),
    portfolioLinks: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("promoterProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!profile) {
      throw new Error("Promoter profile not found");
    }

    const { userId, ...updates } = args;
    return await ctx.db.patch(profile._id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const updatePromoterStats = mutation({
  args: {
    userId: v.id("users"),
    viewsToAdd: v.optional(v.number()),
    earningsToAdd: v.optional(v.number()),
    completedCampaign: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("promoterProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!profile) {
      throw new Error("Promoter profile not found");
    }

    const updates: any = { updatedAt: Date.now() };
    
    if (args.viewsToAdd) {
      updates.totalViews = (profile.totalViews || 0) + args.viewsToAdd;
    }
    
    if (args.earningsToAdd) {
      updates.totalEarnings = (profile.totalEarnings || 0) + args.earningsToAdd;
    }
    
    if (args.completedCampaign) {
      updates.completedCampaigns = (profile.completedCampaigns || 0) + 1;
    }

    // Update tier based on performance
    const totalEarnings = updates.totalEarnings || profile.totalEarnings || 0;
    const completedCampaigns = updates.completedCampaigns || profile.completedCampaigns || 0;
    
    if (totalEarnings >= 1000 && completedCampaigns >= 10) {
      updates.tier = "gold";
    } else if (totalEarnings >= 500 && completedCampaigns >= 5) {
      updates.tier = "silver";
    }

    return await ctx.db.patch(profile._id, updates);
  },
});

export const getTopPromoters = query({
  args: {
    tier: v.optional(v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("promoterProfiles");
    
    if (args.tier) {
      query = query.filter((q) => q.eq(q.field("tier"), args.tier));
    }
    
    const profiles = await query
      .order("desc")
      .take(args.limit || 10);

    // Get user details for each profile
    const promotersWithUsers = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          user,
        };
      })
    );

    return promotersWithUsers;
  },
});

export const searchPromoters = query({
  args: {
    niche: v.optional(v.string()),
    tier: v.optional(v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"))),
    minRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let profiles = await ctx.db.query("promoterProfiles").collect();
    
    if (args.niche !== undefined) {
      profiles = profiles.filter(p => 
        p.niche?.toLowerCase().includes(args.niche!.toLowerCase())
      );
    }
    
    if (args.tier) {
      profiles = profiles.filter(p => p.tier === args.tier);
    }
    
    if (args.minRating !== undefined) {
      profiles = profiles.filter(p => (p.rating || 0) >= args.minRating!);
    }

    // Get user details for each profile
    const promotersWithUsers = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          user,
        };
      })
    );

    return promotersWithUsers;
  },
});