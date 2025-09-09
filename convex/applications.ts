import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Application queries and mutations
export const createApplication = mutation({
  args: {
    campaignId: v.id("campaigns"),
    promoterId: v.id("users"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already applied to this campaign
    const existingApplication = await ctx.db
      .query("applications")
      .filter((q) => 
        q.and(
          q.eq(q.field("campaignId"), args.campaignId),
          q.eq(q.field("promoterId"), args.promoterId)
        )
      )
      .first();

    if (existingApplication) {
      throw new Error("You have already applied to this campaign");
    }

    return await ctx.db.insert("applications", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getApplicationById = query({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getApplicationsByPromoter = query({
  args: { promoterId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("applications")
      .filter((q) => q.eq(q.field("promoterId"), args.promoterId))
      .order("desc")
      .collect();
  },
});

export const getApplicationsByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("applications")
      .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
      .order("desc")
      .collect();
  },
});

export const updateApplicationStatus = mutation({
  args: {
    id: v.id("applications"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const submitApplicationContent = mutation({
  args: {
    id: v.id("applications"),
    submittedContent: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      submittedContent: args.submittedContent,
      updatedAt: Date.now(),
    });
  },
});

export const updateApplicationMetrics = mutation({
  args: {
    id: v.id("applications"),
    viewsGenerated: v.optional(v.number()),
    revenue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const getApplicationsWithCampaignDetails = query({
  args: { promoterId: v.id("users") },
  handler: async (ctx, args) => {
    const applications = await ctx.db
      .query("applications")
      .filter((q) => q.eq(q.field("promoterId"), args.promoterId))
      .order("desc")
      .collect();

    const applicationsWithCampaigns = await Promise.all(
      applications.map(async (app) => {
        const campaign = await ctx.db.get(app.campaignId);
        return {
          ...app,
          campaign,
        };
      })
    );

    return applicationsWithCampaigns;
  },
});