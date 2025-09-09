import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Transaction management
export const createTransaction = mutation({
  args: {
    amount: v.number(),
    type: v.union(v.literal("payment"), v.literal("withdrawal"), v.literal("fee")),
    userId: v.id("users"),
    applicationId: v.optional(v.id("applications")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateTransactionStatus = mutation({
  args: {
    id: v.id("transactions"),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
    });
  },
});

export const getTransactionsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});

export const getAllTransactions = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"))),
    type: v.optional(v.union(v.literal("payment"), v.literal("withdrawal"), v.literal("fee"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("transactions");
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }
    
    return await query.order("desc").collect();
  },
});

export const getFinancialStats = query({
  args: {},
  handler: async (ctx) => {
    const transactions = await ctx.db.query("transactions").collect();
    
    const totalRevenue = transactions
      .filter(t => t.type === "fee" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalPayouts = transactions
      .filter(t => t.type === "payment" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingPayouts = transactions
      .filter(t => t.type === "payment" && t.status === "pending")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawals = transactions
      .filter(t => t.type === "withdrawal" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalRevenue,
      totalPayouts,
      pendingPayouts,
      totalWithdrawals,
      netProfit: totalRevenue - totalPayouts,
    };
  },
});