import { betterAuth } from "better-auth";

// Only initialize auth if DATABASE_URL is available
const databaseUrl = process.env.DATABASE_URL;

// For build time, we can have a placeholder config
if (!databaseUrl && process.env.NODE_ENV === 'production' && process.env.BUILD_PHASE !== 'true') {
  throw new Error('DATABASE_URL is required in production');
}

export const auth = betterAuth({
  database: databaseUrl ? {
    provider: "pg",
    url: databaseUrl,
  } : {
    provider: "pg",
    url: "postgresql://build:build@localhost:5432/build", // Build-time placeholder
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://localhost:3003",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;