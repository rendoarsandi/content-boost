import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/database";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // PostgreSQL
  }),
  
  baseURL: process.env.NEXTAUTH_URL || "http://localhost:3001",
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "your-secret-key",
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  socialProviders: {
    // Use Google as a placeholder for now - TikTok and Instagram will be implemented via custom OAuth
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
    },
  },

  // Additional configuration for role-based access
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "promoter",
      },
    },
  },

  plugins: [],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;