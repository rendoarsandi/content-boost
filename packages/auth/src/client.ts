import { createAuthClient } from 'better-auth/client';
import { authConfig } from './client-config';

export const authClient = createAuthClient({
  baseURL: authConfig.baseURL,

  // Client configuration
  fetchOptions: {
    onError: context => {
      console.error('Auth client error:', context.error);

      // Handle specific error cases
      if (context.error.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login';
      }
    },

    onRequest: context => {
      // Add custom headers if needed
      context.headers = {
        ...context.headers,
        'X-Client-Version': '1.0.0',
      };
    },
  },
});

// Auth hooks for React components
export const { useSession, signIn, signOut, signUp } = authClient;

// Utility functions
export const getCurrentUser = () => {
  return authClient.getSession();
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const session = await authClient.getSession();
    return !!session?.data?.user;
  } catch {
    return false;
  }
};

export const hasRole = async (
  requiredRole: 'creator' | 'promoter' | 'admin'
): Promise<boolean> => {
  try {
    const session = await authClient.getSession();
    // Role checking will be implemented when user roles are properly configured
    return !!session?.data?.user;
  } catch {
    return false;
  }
};

export const hasAnyRole = async (
  roles: ('creator' | 'promoter' | 'admin')[]
): Promise<boolean> => {
  try {
    const session = await authClient.getSession();
    // Role checking will be implemented when user roles are properly configured
    return !!session?.data?.user;
  } catch {
    return false;
  }
};

// Social account management
export const getSocialAccounts = async () => {
  try {
    const response = await fetch('/api/auth/social-accounts', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch social accounts');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    return [];
  }
};

export const disconnectSocialAccount = async (
  provider: 'tiktok' | 'instagram'
) => {
  try {
    const response = await fetch(`/api/auth/unlink/${provider}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to disconnect ${provider} account`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error disconnecting ${provider} account:`, error);
    throw error;
  }
};

// Token refresh utility
export const refreshSocialToken = async (provider: 'tiktok' | 'instagram') => {
  try {
    const response = await fetch(`/api/auth/refresh-token/${provider}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh ${provider} token`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error refreshing ${provider} token:`, error);
    throw error;
  }
};
