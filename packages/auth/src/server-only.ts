import 'server-only';
import { supabase } from '@repo/config/supabase';
import type { User, Session } from '@supabase/supabase-js';

export const getUser = async (): Promise<User | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getSession = async (): Promise<Session | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

export const requireAuth = async (): Promise<User> => {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
};

export const requireSession = async (): Promise<Session> => {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
};

export const auth = {
  getUser,
  getSession,
  requireAuth,
  requireSession,
};
