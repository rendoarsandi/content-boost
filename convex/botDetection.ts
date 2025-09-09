import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Bot detection system
export const createBotDetectionLog = mutation({
  args: {
    applicationId: v.id("applications"),
    detectionType: v.string(),
    confidence: v.number(),
    details: v.object({
      ipAddress: v.optional(v.string()),
      userAgent: v.optional(v.string()),
      viewPattern: v.optional(v.string()),
      flags: v.optional(v.array(v.string())),
    }),
    action: v.union(v.literal("flagged"), v.literal("blocked"), v.literal("manual_review")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("botDetectionLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getBotDetectionLogs = query({
  args: {
    applicationId: v.optional(v.id("applications")),
    action: v.optional(v.union(v.literal("flagged"), v.literal("blocked"), v.literal("manual_review"))),
    minConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("botDetectionLogs");
    
    if (args.applicationId) {
      query = query.filter((q) => q.eq(q.field("applicationId"), args.applicationId));
    }
    
    if (args.action) {
      query = query.filter((q) => q.eq(q.field("action"), args.action));
    }
    
    const logs = await query.order("desc").collect();
    
    if (args.minConfidence !== undefined) {
      return logs.filter(log => log.confidence >= args.minConfidence!);
    }
    
    return logs;
  },
});

export const analyzeBotActivity = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("botDetectionLogs")
      .filter((q) => q.eq(q.field("applicationId"), args.applicationId))
      .collect();

    const totalDetections = logs.length;
    const highConfidenceDetections = logs.filter(log => log.confidence > 0.8).length;
    const blockedActivity = logs.filter(log => log.action === "blocked").length;
    const flaggedActivity = logs.filter(log => log.action === "flagged").length;
    
    const averageConfidence = totalDetections > 0 
      ? logs.reduce((sum, log) => sum + log.confidence, 0) / totalDetections 
      : 0;

    return {
      totalDetections,
      highConfidenceDetections,
      blockedActivity,
      flaggedActivity,
      averageConfidence,
      riskLevel: averageConfidence > 0.8 ? "high" : averageConfidence > 0.5 ? "medium" : "low",
    };
  },
});

// Automated bot detection function
export const runBotDetection = mutation({
  args: {
    applicationId: v.id("applications"),
    viewData: v.object({
      ipAddresses: v.array(v.string()),
      userAgents: v.array(v.string()),
      viewTimes: v.array(v.number()),
      referrers: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const { applicationId, viewData } = args;
    
    // Simple bot detection logic (can be enhanced)
    const suspiciousActivity = [];
    
    // Check for duplicate IP addresses
    const ipCounts = new Map();
    viewData.ipAddresses.forEach(ip => {
      ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
    });
    
    const duplicateIPs = Array.from(ipCounts.entries()).filter(([_, count]) => count > 10);
    if (duplicateIPs.length > 0) {
      suspiciousActivity.push("high_duplicate_ips");
    }
    
    // Check for bot user agents
    const botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
    const botUserAgents = viewData.userAgents.filter(ua => 
      botPatterns.some(pattern => ua.toLowerCase().includes(pattern))
    );
    
    if (botUserAgents.length > 0) {
      suspiciousActivity.push("bot_user_agents");
    }
    
    // Check for unusual view patterns
    const avgViewTime = viewData.viewTimes.reduce((a, b) => a + b, 0) / viewData.viewTimes.length;
    const shortViews = viewData.viewTimes.filter(time => time < 1000).length; // Less than 1 second
    
    if (shortViews / viewData.viewTimes.length > 0.5) {
      suspiciousActivity.push("short_view_duration");
    }
    
    const confidence = Math.min(suspiciousActivity.length * 0.3, 1);
    const action = confidence > 0.8 ? "blocked" : confidence > 0.5 ? "flagged" : "manual_review";
    
    if (suspiciousActivity.length > 0) {
      await ctx.db.insert("botDetectionLogs", {
        applicationId,
        detectionType: "automated_analysis",
        confidence,
        details: {
          flags: suspiciousActivity,
          ipAddress: viewData.ipAddresses[0],
          userAgent: viewData.userAgents[0],
          viewPattern: `${viewData.viewTimes.length} views, avg ${Math.round(avgViewTime)}ms`,
        },
        action,
        createdAt: Date.now(),
      });
    }
    
    return {
      detected: suspiciousActivity.length > 0,
      confidence,
      action,
      flags: suspiciousActivity,
    };
  },
});