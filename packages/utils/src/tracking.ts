import { randomBytes } from 'crypto';

/**
 * Generate a unique tracking link for a promoter-campaign combination
 */
export function generateTrackingLink(campaignId: string, promoterId: string): string {
  // Generate a unique identifier
  const uniqueId = randomBytes(16).toString('hex');
  
  // Create a tracking code that combines promoter, campaign, and unique ID
  const trackingCode = `${promoterId.slice(0, 8)}-${campaignId.slice(0, 8)}-${uniqueId}`;
  
  return trackingCode;
}

/**
 * Parse tracking link to extract promoter and campaign information
 */
export function parseTrackingLink(trackingLink: string): {
  promoterPrefix: string;
  campaignPrefix: string;
  uniqueId: string;
} | null {
  const parts = trackingLink.split('-');
  
  if (parts.length !== 3) {
    return null;
  }
  
  return {
    promoterPrefix: parts[0],
    campaignPrefix: parts[1],
    uniqueId: parts[2],
  };
}

/**
 * Validate tracking link format
 */
export function isValidTrackingLink(trackingLink: string): boolean {
  const parsed = parseTrackingLink(trackingLink);
  return parsed !== null && 
         parsed.promoterPrefix.length === 8 && 
         parsed.campaignPrefix.length === 8 && 
         parsed.uniqueId.length === 32;
}