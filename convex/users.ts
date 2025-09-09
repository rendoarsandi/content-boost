import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Users queries and mutations
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    role: v.union(v.literal("creator"), v.literal("promoter"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      ...args,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateUser = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("banned"), v.literal("pending"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const banUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: "banned",
      updatedAt: Date.now(),
    });
  },
});

export const unbanUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: "active",
      updatedAt: Date.now(),
    });
  },
});

export const getAllUsers = query({
  args: {
    role: v.optional(v.union(v.literal("creator"), v.literal("promoter"), v.literal("admin"))),
    status: v.optional(v.union(v.literal("active"), v.literal("banned"), v.literal("pending"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("users");
    
    if (args.role) {
      query = query.filter((q) => q.eq(q.field("role"), args.role));
    }
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    return await query.collect();
  },
});