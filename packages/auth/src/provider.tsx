"use client";

import { createContext, useContext, ReactNode } from "react";
import { authClient, useSession } from "./client";

interface BetterAuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext(authClient);

export function BetterAuthProvider({ children }: BetterAuthProviderProps) {
  return (
    <AuthContext.Provider value={authClient}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Re-export the useSession hook for convenience
export { useSession };