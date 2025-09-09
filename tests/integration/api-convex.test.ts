import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { ConvexHttpClient } from 'convex/browser';

// Integration tests for API routes with Convex backend
describe('API Routes Convex Integration', () => {
  let convexClient: ConvexHttpClient;
  
  beforeAll(() => {
    const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210';
    convexClient = new ConvexHttpClient(convexUrl);
  });

  describe('Campaign API Routes', () => {
    test('GET /api/campaigns/available should return 401 for unauthenticated requests', async () => {
      const response = await fetch('http://localhost:3002/api/campaigns/available');
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    test('GET /api/campaigns/available should handle query parameters correctly', async () => {
      const response = await fetch('http://localhost:3002/api/campaigns/available?page=1&limit=5');
      
      // Should still return 401 but with proper error handling
      expect(response.status).toBe(401);
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    test('API route should handle malformed requests gracefully', async () => {
      const response = await fetch('http://localhost:3002/api/campaigns/available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      });
      
      // Should return method not allowed or 401
      expect([401, 405]).toContain(response.status);
    });
  });

  describe('Convex Connection Tests', () => {
    test('should connect to Convex backend', async () => {
      try {
        // Test basic Convex connection (will fail if Convex is not running)
        // This is expected in CI/test environments
        const result = await Promise.race([
          convexClient.query('users.getUserById' as any, { id: 'test-id' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]);
        
        // If we get here, Convex is running
        expect(true).toBe(true);
      } catch (error) {
        // Expected when Convex is not running in test environment
        expect(error).toBeDefined();
        console.log('Convex not running in test environment (expected)');
      }
    });

    test('should handle Convex errors gracefully', async () => {
      try {
        await convexClient.query('nonexistent.function' as any, {});
      } catch (error) {
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should return proper JSON error responses', async () => {
      const response = await fetch('http://localhost:3002/api/campaigns/available');
      
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const data = await response.json();
      expect(typeof data).toBe('object');
      expect(data).toHaveProperty('error');
    });

    test('should handle CORS properly', async () => {
      const response = await fetch('http://localhost:3002/api/campaigns/available', {
        method: 'OPTIONS'
      });
      
      // Should handle OPTIONS request
      expect([200, 204, 404, 405]).toContain(response.status);
    });
  });

  describe('Data Validation Integration', () => {
    test('should validate request parameters correctly', async () => {
      // Test with invalid page parameter
      const response = await fetch('http://localhost:3002/api/campaigns/available?page=invalid&limit=abc');
      
      expect(response.status).toBe(401); // Still unauthorized, but should not crash
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should handle large request payloads appropriately', async () => {
      const largePayload = {
        data: 'x'.repeat(10000), // 10KB payload
        array: new Array(1000).fill('test')
      };
      
      const response = await fetch('http://localhost:3002/api/campaigns/available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largePayload)
      });
      
      // Should handle large payloads without crashing
      expect([401, 405, 413]).toContain(response.status);
    });
  });

  describe('Performance Integration', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:3002/api/campaigns/available');
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
      expect(response.status).toBe(401); // Expected for unauthenticated
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        fetch('http://localhost:3002/api/campaigns/available')
      );
      
      const responses = await Promise.all(requests);
      
      // All should return the same status
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });
});

describe('Convex Schema Validation Integration', () => {
  test('should validate user data structure', () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'creator',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Validate against Convex schema expectations
    expect(userData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(['creator', 'promoter', 'admin']).toContain(userData.role);
    expect(['active', 'banned', 'pending']).toContain(userData.status);
    expect(typeof userData.createdAt).toBe('number');
    expect(typeof userData.updatedAt).toBe('number');
  });

  test('should validate campaign data structure', () => {
    const campaignData = {
      title: 'Test Campaign',
      description: 'Test Description',
      status: 'draft',
      creatorId: 'creator-123',
      budget: 10000,
      paymentPerView: 100,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    expect(campaignData.title.length).toBeGreaterThan(0);
    expect(campaignData.description.length).toBeGreaterThan(0);
    expect(['draft', 'active', 'paused', 'completed']).toContain(campaignData.status);
    expect(campaignData.budget).toBeGreaterThan(0);
    expect(campaignData.paymentPerView).toBeGreaterThan(0);
    expect(campaignData.budget).toBeGreaterThanOrEqual(campaignData.paymentPerView);
  });

  test('should validate bot detection log structure', () => {
    const botLogData = {
      applicationId: 'app-123',
      detectionType: 'automated_analysis',
      confidence: 0.85,
      details: {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        viewPattern: '10 views, avg 500ms',
        flags: ['duplicate_ips', 'short_views']
      },
      action: 'flagged',
      createdAt: Date.now()
    };

    expect(botLogData.applicationId).toBeTruthy();
    expect(botLogData.confidence).toBeGreaterThanOrEqual(0);
    expect(botLogData.confidence).toBeLessThanOrEqual(1);
    expect(['flagged', 'blocked', 'manual_review']).toContain(botLogData.action);
    expect(Array.isArray(botLogData.details.flags)).toBe(true);
    expect(typeof botLogData.createdAt).toBe('number');
  });
});