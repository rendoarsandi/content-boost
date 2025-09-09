import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    role: v.union(v.literal("creator"), v.literal("promoter"), v.literal("admin")),
    status: v.union(v.literal("active"), v.literal("banned"), v.literal("pending")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_email", ["email"])
  .index("by_role", ["role"]),

  // Campaigns table
  campaigns: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("paused"), v.literal("completed")),
    creatorId: v.id("users"),
    budget: v.number(),
    targetAudience: v.optional(v.string()),
    requirements: v.optional(v.string()),
    paymentPerView: v.number(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_creator", ["creatorId"])
  .index("by_status", ["status"])
  .index("by_created_at", ["createdAt"]),

  // Applications (promoters applying to campaigns)
  applications: defineTable({
    campaignId: v.id("campaigns"),
    promoterId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("completed")),
    message: v.optional(v.string()),
    submittedContent: v.optional(v.string()),
    viewsGenerated: v.optional(v.number()),
    revenue: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_campaign", ["campaignId"])
  .index("by_promoter", ["promoterId"])
  .index("by_status", ["status"]),

  // Transactions for payments
  transactions: defineTable({
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    type: v.union(v.literal("payment"), v.literal("withdrawal"), v.literal("fee")),
    userId: v.id("users"),
    applicationId: v.optional(v.id("applications")),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_status", ["status"])
  .index("by_type", ["type"]),

  // Promoter profiles
  promoterProfiles: defineTable({
    userId: v.id("users"),
    bio: v.optional(v.string()),
    niche: v.optional(v.string()),
    portfolioLinks: v.optional(v.array(v.string())),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
    totalViews: v.optional(v.number()),
    totalEarnings: v.optional(v.number()),
    rating: v.optional(v.number()),
    completedCampaigns: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_tier", ["tier"])
  .index("by_rating", ["rating"]),

  // Social accounts for authentication
  socialAccounts: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_provider", ["provider"])
  .index("by_provider_id", ["provider", "providerId"]),

  // Bot detection logs
  botDetectionLogs: defineTable({
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
    createdAt: v.number(),
  })
  .index("by_application", ["applicationId"])
  .index("by_confidence", ["confidence"])
  .index("by_action", ["action"]),

  // Campaign templates
  campaignTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    templateConfig: v.object({
      defaultBudget: v.optional(v.number()),
      suggestedPayment: v.optional(v.number()),
      targetAudience: v.optional(v.string()),
      requirements: v.optional(v.string()),
    }),
    previewImage: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_category", ["category"])
  .index("by_active", ["isActive"]),

  // A/B Testing
  abTests: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("running"), v.literal("completed")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    winnerVariantId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_campaign", ["campaignId"])
  .index("by_status", ["status"]),

  // A/B Test Variants
  abTestVariants: defineTable({
    testId: v.id("abTests"),
    name: v.string(),
    description: v.optional(v.string()),
    config: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      paymentPerView: v.optional(v.number()),
    }),
    trafficPercentage: v.number(),
    conversions: v.optional(v.number()),
    views: v.optional(v.number()),
    createdAt: v.number(),
  })
  .index("by_test", ["testId"]),

  // Gamification badges
  badges: defineTable({
    name: v.string(),
    description: v.string(),
    iconUrl: v.optional(v.string()),
    requirements: v.object({
      type: v.string(),
      threshold: v.number(),
      description: v.string(),
    }),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
  .index("by_active", ["isActive"]),

  // User achievements
  userAchievements: defineTable({
    userId: v.id("users"),
    badgeId: v.id("badges"),
    earnedAt: v.number(),
    metadata: v.optional(v.object({
      value: v.optional(v.number()),
      description: v.optional(v.string()),
    })),
  })
  .index("by_user", ["userId"])
  .index("by_badge", ["badgeId"]),

  // Chat conversations
  conversations: defineTable({
    participants: v.array(v.id("users")),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
  .index("by_participants", ["participants"]),

  // Chat messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    messageType: v.union(v.literal("text"), v.literal("image"), v.literal("file")),
    readBy: v.optional(v.array(v.id("users"))),
    createdAt: v.number(),
  })
  .index("by_conversation", ["conversationId"])
  .index("by_sender", ["senderId"])
  .index("by_created_at", ["createdAt"]),
});