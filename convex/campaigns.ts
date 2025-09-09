import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Campaign queries and mutations
export const createCampaign = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    creatorId: v.id("users"),
    budget: v.number(),
    paymentPerView: v.number(),
    targetAudience: v.optional(v.string()),
    requirements: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("campaigns", {
      ...args,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getCampaignById = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getCampaignsByCreator = query({
  args: { creatorId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaigns")
      .filter((q) => q.eq(q.field("creatorId"), args.creatorId))
      .order("desc")
      .collect();
  },
});

export const getAvailableCampaigns = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("campaigns")
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();
  },
});

export const updateCampaign = mutation({
  args: {
    id: v.id("campaigns"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("paused"), v.literal("completed"))),
    budget: v.optional(v.number()),
    paymentPerView: v.optional(v.number()),
    targetAudience: v.optional(v.string()),
    requirements: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteCampaign = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

export const getCampaignStats = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const applications = await ctx.db
      .query("applications")
      .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
      .collect();

    const totalApplications = applications.length;
    const approvedApplications = applications.filter(app => app.status === "approved").length;
    const completedApplications = applications.filter(app => app.status === "completed").length;
    const totalViews = applications.reduce((sum, app) => sum + (app.viewsGenerated || 0), 0);
    const totalRevenue = applications.reduce((sum, app) => sum + (app.revenue || 0), 0);

    return {
      totalApplications,
      approvedApplications,
      completedApplications,
      totalViews,
      totalRevenue,
    };
  },
});