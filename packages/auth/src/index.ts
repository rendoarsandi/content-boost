// Main auth exports - provides both client and server utilities
export * from './client';
export * from './config';
export * from './types';
export * from './social';
export * from './provider';

// Server-only exports (for API routes and server components)
export { auth, getServerSession, requireAuth, getSession } from './server-only';

// Legacy Supabase exports (for backward compatibility during migration)
import { supabase } from '@repo/config/supabase';
import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';

// Legacy functions - marked for deprecation
/** @deprecated Use BetterAuth signUp instead */
export const signUp = async (credentials: any) => {
  const { email, password } = credentials;
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, error };
};

/** @deprecated Use BetterAuth signIn instead */
export const signInWithPassword = async (credentials: any) => {
  const { email, password } = credentials;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { session: data.session, error };
};

/** @deprecated Use BetterAuth signOut instead */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

/** @deprecated Use BetterAuth getSession instead */
export const getLegacySession = async (): Promise<{
  session: Session | null;
  error: AuthError | null;
}> => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
};

/** @deprecated Use BetterAuth useSession hook instead */
export const onAuthStateChange = (
  callback: (event: string, session: Session | null) => void
) => {
  const { data: authListener } = supabase.auth.onAuthStateChange(callback);
  return authListener;
};

export type { SupabaseUser, Session };
