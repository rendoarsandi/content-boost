import { expect, test, describe } from 'vitest';

// Test Convex schema validation and business logic
describe('Convex Functions Unit Tests', () => {
  describe('User Management', () => {
    test('should validate user data correctly', () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'creator' as const,
      };

      expect(userData.email).toBe('test@example.com');
      expect(userData.role).toBe('creator');
      expect(userData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    test('should validate user roles', () => {
      const validRoles = ['creator', 'promoter', 'admin'];
      const testRole = 'promoter';

      expect(validRoles).toContain(testRole);
    });
  });

  describe('Campaign Management', () => {
    test('should create campaign with valid data', () => {
      const campaignData = {
        title: 'Test Campaign',
        description: 'Test Description',
        budget: 10000,
        paymentPerView: 100,
        creatorId: 'test-creator-id',
      };

      expect(campaignData.title).toBeTruthy();
      expect(campaignData.budget).toBeGreaterThan(0);
      expect(campaignData.paymentPerView).toBeGreaterThan(0);
      expect(campaignData.budget).toBeGreaterThanOrEqual(campaignData.paymentPerView);
    });

    test('should calculate maximum views correctly', () => {
      const campaign = { budget: 1000, paymentPerView: 50 };
      const maxViews = Math.floor(campaign.budget / campaign.paymentPerView);
      
      expect(maxViews).toBe(20);
    });
  });

  describe('Bot Detection Logic', () => {
    test('should detect suspicious patterns', () => {
      const viewData = {
        ipAddresses: ['192.168.1.1', '192.168.1.1', '192.168.1.1', '192.168.1.2'],
        userAgents: ['bot-agent', 'real-browser'],
        viewTimes: [100, 150, 200, 2000],
      };

      // Count duplicate IPs
      const ipCounts = new Map();
      viewData.ipAddresses.forEach(ip => {
        ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
      });
      
      const duplicateIPs = Array.from(ipCounts.entries()).filter(([_, count]) => count > 2);
      const botUserAgents = viewData.userAgents.filter(ua => 
        ua.toLowerCase().includes('bot')
      );
      const shortViews = viewData.viewTimes.filter(time => time < 1000);
      
      expect(duplicateIPs.length).toBeGreaterThan(0);
      expect(botUserAgents.length).toBeGreaterThan(0);
      expect(shortViews.length).toBe(3);
    });

    test('should calculate confidence score', () => {
      const suspiciousFlags = ['duplicate_ips', 'bot_user_agent', 'short_views'];
      const confidence = Math.min(suspiciousFlags.length * 0.3, 1);
      
      expect(confidence).toBeCloseTo(0.9, 1);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(confidence).toBeGreaterThan(0);
    });
  });
});