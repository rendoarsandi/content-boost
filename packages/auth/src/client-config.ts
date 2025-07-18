// Client-side auth configuration without database imports
export const authConfig = {
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3001",
  
  socialProviders: {
    tiktok: {
      enabled: true,
    },
    instagram: {
      enabled: true,
    },
  },
};

// Types for client-side usage
export interface ClientUser {
  id: string;
  email: string;
  name: string;
  role?: "creator" | "promoter" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientSession {
  user: ClientUser;
  expires: Date;
}