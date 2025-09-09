import { auth } from "./config";
import { headers } from "next/headers";

export async function getServerSession() {
  const sessionToken = headers().get("authorization")?.replace("Bearer ", "");
  
  if (!sessionToken) {
    return null;
  }

  try {
    const session = await auth.api.getSession({
      headers: new Headers({
        authorization: `Bearer ${sessionToken}`,
      }),
    });
    
    return session;
  } catch (error) {
    console.error("Failed to get server session:", error);
    return null;
  }
}

export async function requireAuth() {
  const session = await getServerSession();
  
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return session;
}

export { auth };

// Alias for backward compatibility
export const getSession = getServerSession;