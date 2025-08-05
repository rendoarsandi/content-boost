export * from './types';

// Export OAuth handlers
export {
  handleTikTokAuth,
  handleInstagramAuth,
  handleLinkTikTok,
  handleLinkInstagram,
  handleUnlinkTikTok,
  handleUnlinkInstagram,
  handleGetSocialAccounts,
  handleRefreshTikTokToken,
  handleRefreshInstagramToken,
} from './handlers/oauth';

// Export client
export {
  authClient,
  useSession,
  signIn,
  signOut,
  signUp,
  getCurrentUser,
  isAuthenticated,
  hasRole,
  hasAnyRole,
  getSocialAccounts,
  disconnectSocialAccount,
  refreshSocialToken,
} from './client';

// Export middleware
export {
  authMiddleware,
  rateLimitMiddleware,
  csrfMiddleware,
  createAuthMiddleware,
} from './middleware';
