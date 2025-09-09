import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Seed test data for development and testing
export const seedTestData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingUsers = await ctx.db.query("users").take(1);
    if (existingUsers.length > 0) {
      return { message: "Test data already exists", seeded: false };
    }

    const now = Date.now();

    // Create test users
    const testUsers = [
      {
        email: "creator1@test.com",
        name: "Test Creator 1",
        role: "creator" as const,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "creator2@test.com", 
        name: "Test Creator 2",
        role: "creator" as const,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "promoter1@test.com",
        name: "Test Promoter 1", 
        role: "promoter" as const,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "promoter2@test.com",
        name: "Test Promoter 2",
        role: "promoter" as const, 
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: "admin@test.com",
        name: "Test Admin",
        role: "admin" as const,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      }
    ];

    const userIds = [];
    for (const user of testUsers) {
      const userId = await ctx.db.insert("users", user);
      userIds.push(userId);
    }

    // Create promoter profiles for promoter users
    const promoterUserIds = userIds.slice(2, 4); // promoter1 and promoter2
    for (const userId of promoterUserIds) {
      await ctx.db.insert("promoterProfiles", {
        userId,
        bio: "Test promoter with experience in social media marketing",
        niche: "Technology",
        portfolioLinks: ["https://tiktok.com/@testpromoter", "https://instagram.com/testpromoter"],
        tier: "bronze" as const,
        totalViews: 0,
        totalEarnings: 0,
        rating: 0,
        completedCampaigns: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create test campaigns
    const creatorUserIds = userIds.slice(0, 2); // creator1 and creator2
    const campaignIds = [];
    
    const testCampaigns = [
      {
        title: "Summer Product Launch",
        description: "Promote our new summer collection across social media platforms",
        status: "active" as const,
        creatorId: creatorUserIds[0],
        budget: 50000,
        paymentPerView: 100,
        targetAudience: "Young adults 18-35 interested in fashion",
        requirements: "Must have 10k+ followers and good engagement rate",
        startDate: now,
        endDate: now + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdAt: now,
        updatedAt: now,
      },
      {
        title: "Tech Gadget Review Campaign", 
        description: "Create authentic reviews for our latest tech gadgets",
        status: "active" as const,
        creatorId: creatorUserIds[1], 
        budget: 75000,
        paymentPerView: 150,
        targetAudience: "Tech enthusiasts and early adopters",
        requirements: "Experience with tech reviews and genuine engagement",
        startDate: now,
        endDate: now + (45 * 24 * 60 * 60 * 1000), // 45 days from now
        createdAt: now,
        updatedAt: now,
      },
      {
        title: "Fitness Challenge Campaign",
        description: "Promote our fitness app through workout challenges", 
        status: "draft" as const,
        creatorId: creatorUserIds[0],
        budget: 30000,
        paymentPerView: 75,
        targetAudience: "Fitness enthusiasts and health-conscious individuals",
        requirements: "Active in fitness content creation",
        createdAt: now,
        updatedAt: now,
      }
    ];

    for (const campaign of testCampaigns) {
      const campaignId = await ctx.db.insert("campaigns", campaign);
      campaignIds.push(campaignId);
    }

    // Create test applications
    const activeCampaignIds = campaignIds.slice(0, 2); // Only active campaigns
    for (const campaignId of activeCampaignIds) {
      for (const promoterId of promoterUserIds) {
        await ctx.db.insert("applications", {
          campaignId,
          promoterId,
          status: "pending" as const,
          message: "I would love to promote this campaign with my engaged audience!",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Create test badges
    const badgeIds = [];
    const testBadges = [
      {
        name: "First Campaign",
        description: "Completed your first campaign successfully",
        iconUrl: "/badges/first-campaign.svg",
        requirements: {
          type: "campaigns_completed",
          threshold: 1,
          description: "Complete 1 campaign"
        },
        isActive: true,
        createdAt: now,
      },
      {
        name: "Rising Star", 
        description: "Generated over 10,000 views across campaigns",
        iconUrl: "/badges/rising-star.svg",
        requirements: {
          type: "total_views",
          threshold: 10000,
          description: "Generate 10,000+ total views"
        },
        isActive: true,
        createdAt: now,
      },
      {
        name: "Top Performer",
        description: "Achieved silver tier status",
        iconUrl: "/badges/top-performer.svg", 
        requirements: {
          type: "tier_reached",
          threshold: 2,
          description: "Reach Silver tier"
        },
        isActive: true,
        createdAt: now,
      }
    ];

    for (const badge of testBadges) {
      const badgeId = await ctx.db.insert("badges", badge);
      badgeIds.push(badgeId);
    }

    // Create test campaign templates
    const testTemplates = [
      {
        name: "Product Launch Template",
        description: "Perfect for launching new products with influencer partnerships",
        category: "Product Launch",
        templateConfig: {
          defaultBudget: 25000,
          suggestedPayment: 100,
          targetAudience: "Product-specific audience",
          requirements: "Minimum 5k followers with good engagement"
        },
        previewImage: "/templates/product-launch.jpg",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Brand Awareness Template",
        description: "Build brand awareness through authentic content creators",
        category: "Brand Awareness", 
        templateConfig: {
          defaultBudget: 40000,
          suggestedPayment: 75,
          targetAudience: "Broad demographic aligned with brand values",
          requirements: "Consistent content creation and brand alignment"
        },
        previewImage: "/templates/brand-awareness.jpg",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }
    ];

    for (const template of testTemplates) {
      await ctx.db.insert("campaignTemplates", template);
    }

    // Create some test transactions
    for (const userId of userIds) {
      if (Math.random() > 0.5) { // 50% chance to have transactions
        await ctx.db.insert("transactions", {
          amount: Math.floor(Math.random() * 5000) + 500, // Random amount between 500-5500
          status: "completed" as const,
          type: "payment" as const,
          userId,
          description: "Test payment for campaign completion",
          createdAt: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
        });
      }
    }

    return {
      message: "Test data seeded successfully",
      seeded: true,
      data: {
        users: userIds.length,
        campaigns: campaignIds.length,
        applications: activeCampaignIds.length * promoterUserIds.length,
        badges: badgeIds.length,
        templates: testTemplates.length,
      }
    };
  },
});

export const clearTestData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all test data (use with caution!)
    const tables = [
      "userAchievements",
      "messages", 
      "conversations",
      "botDetectionLogs",
      "abTestMetrics",
      "abTestVariants",
      "abTests",
      "promoterInsights",
      "promoterRecommendations",
      "campaignTemplates",
      "transactions",
      "applications",
      "campaigns",
      "promoterProfiles",
      "badges",
      "users",
    ];

    const deletedCounts: Record<string, number> = {};

    for (const table of tables) {
      const records = await ctx.db.query(table as any).collect();
      deletedCounts[table] = records.length;
      
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
    }

    return {
      message: "All test data cleared",
      deletedCounts,
    };
  },
});

export const getTestDataStats = mutation({
  args: {},
  handler: async (ctx) => {
    const stats = {
      users: await ctx.db.query("users").collect().then(r => r.length),
      campaigns: await ctx.db.query("campaigns").collect().then(r => r.length),
      applications: await ctx.db.query("applications").collect().then(r => r.length),
      transactions: await ctx.db.query("transactions").collect().then(r => r.length),
      promoterProfiles: await ctx.db.query("promoterProfiles").collect().then(r => r.length),
      badges: await ctx.db.query("badges").collect().then(r => r.length),
      campaignTemplates: await ctx.db.query("campaignTemplates").collect().then(r => r.length),
    };

    return {
      message: "Test data statistics",
      stats,
      totalRecords: Object.values(stats).reduce((sum, count) => sum + count, 0),
    };
  },
});