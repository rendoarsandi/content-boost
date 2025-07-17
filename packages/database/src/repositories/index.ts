// Repository exports
export * from './base';
export * from './user';
export * from './campaign';
export * from './tracking';
export * from './payment';

// Repository instances
import { UserRepository, SocialAccountRepository } from './user';
import { CampaignRepository, CampaignMaterialRepository, CampaignApplicationRepository } from './campaign';
import { ViewRecordRepository, TrackingSessionRepository } from './tracking';
import { PayoutRepository, PlatformRevenueRepository, WithdrawalRepository } from './payment';

// Create repository instances
export const userRepository = new UserRepository();
export const socialAccountRepository = new SocialAccountRepository();
export const campaignRepository = new CampaignRepository();
export const campaignMaterialRepository = new CampaignMaterialRepository();
export const campaignApplicationRepository = new CampaignApplicationRepository();
export const viewRecordRepository = new ViewRecordRepository();
export const trackingSessionRepository = new TrackingSessionRepository();
export const payoutRepository = new PayoutRepository();
export const platformRevenueRepository = new PlatformRevenueRepository();
export const withdrawalRepository = new WithdrawalRepository();

// Repository collection for easy access
export const repositories = {
  user: userRepository,
  socialAccount: socialAccountRepository,
  campaign: campaignRepository,
  campaignMaterial: campaignMaterialRepository,
  campaignApplication: campaignApplicationRepository,
  viewRecord: viewRecordRepository,
  trackingSession: trackingSessionRepository,
  payout: payoutRepository,
  platformRevenue: platformRevenueRepository,
  withdrawal: withdrawalRepository,
} as const;