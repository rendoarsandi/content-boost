import { supabase } from '@repo/config/supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';

export const signUp = async (credentials: any) => {
  const { email, password } = credentials;
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, error };
};

export const signInWithPassword = async (credentials: any) => {
  const { email, password } = credentials;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { session: data.session, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getSession = async (): Promise<{
  session: Session | null;
  error: AuthError | null;
}> => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
};

export const onAuthStateChange = (
  callback: (event: string, session: Session | null) => void
) => {
  const { data: authListener } = supabase.auth.onAuthStateChange(callback);
  return authListener;
};

export type { User, Session };
