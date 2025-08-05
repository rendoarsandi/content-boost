import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET as getMetrics } from '../../../app/api/campaigns/[id]/metrics/route';
import { db } from '@repo/database';
import { campaigns, viewRecords, campaignApplications } from '@repo/database';
import { sum, count } from 'drizzle-orm';

// Mock Next.js auth
vi.mock('@repo/auth/server-only', () => ({
  getSession: vi.fn(),
}));

// Mock database
vi.mock('@repo/database', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: 'test-campaign-id' }])),
      })),
    })),
  },
  campaigns: {},
  viewRecords: {},
  campaignApplications: {},
}));

// Import auth mock to manipulate it
import { getSession } from '@repo/auth/server-only';

describe('Campaign Metrics API Integration Tests', () => {
  const mockCreatorSession = {
    user: {
      id: 'test-creator-id',
      role: 'creator',
      name: 'Test Creator',
      email: 'creator@test.com',
    },
  };

  const mockPromoterSession = {
    user: {
      id: 'test-promoter-id',
      role: 'promoter',
      name: 'Test Promoter',
      email: 'promoter@test.com',
    },
  };

  const mockCampaign = {
    id: 'test-campaign-id',
    creatorId: 'test-creator-id',
    title: 'Test Campaign',
    description: 'Test Description',
    budget: '1000',
    ratePerView: '10',
    status: 'active',
    requirements: ['Test Requirement'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/campaigns/[id]/metrics', () => {
    test('should return 401 when not authenticated', async () => {
      // Mock unauthenticated session
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id/metrics'
      );
      const response = await getMetrics(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );
    });

    test('should return 403 when user is not a creator', async () => {
      // Mock promoter session
      vi.mocked(getSession).mockResolvedValueOnce(mockPromoterSession);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id/metrics'
      );
      const response = await getMetrics(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Forbidden - Only creators can view campaign metrics',
        })
      );
    });

    test('should return 404 when campaign not found', async () => {
      // Mock creator session
      vi.mocked(getSession).mockResolvedValueOnce(mockCreatorSession);

      // Mock empty database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/non-existent-id/metrics'
      );
      const response = await getMetrics(request, {
        params: { id: 'non-existent-id' },
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Campaign not found',
        })
      );
    });

    test('should return metrics for campaign owner', async () => {
      // Mock creator session
      vi.mocked(getSession).mockResolvedValueOnce(mockCreatorSession);

      // Mock campaign database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCampaign]),
        }),
      } as any);

      // Mock view metrics response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              totalViews: 500,
              legitimateViews: 450,
            },
          ]),
        }),
      } as any);

      // Mock legitimate views metrics
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              legitimateViews: 450,
            },
          ]),
        }),
      } as any);

      // Mock bot views metrics
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              botViews: 50,
            },
          ]),
        }),
      } as any);

      // Mock active promoters count
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              count: 5,
            },
          ]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id/metrics'
      );
      const response = await getMetrics(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(
        expect.objectContaining({
          metrics: expect.objectContaining({
            totalViews: 500,
            legitimateViews: 450,
            botViews: 50,
            activePromoters: 5,
            estimatedSpent: 4500, // 450 legitimate views * 10 rate per view
          }),
        })
      );
    });

    test('should handle empty metrics data', async () => {
      // Mock creator session
      vi.mocked(getSession).mockResolvedValueOnce(mockCreatorSession);

      // Mock campaign database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCampaign]),
        }),
      } as any);

      // Mock empty view metrics response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              totalViews: null,
              legitimateViews: null,
            },
          ]),
        }),
      } as any);

      // Mock empty legitimate views metrics
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              legitimateViews: null,
            },
          ]),
        }),
      } as any);

      // Mock empty bot views metrics
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              botViews: null,
            },
          ]),
        }),
      } as any);

      // Mock empty active promoters count
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              count: null,
            },
          ]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id/metrics'
      );
      const response = await getMetrics(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(
        expect.objectContaining({
          metrics: expect.objectContaining({
            totalViews: 0,
            legitimateViews: 0,
            botViews: 0,
            activePromoters: 0,
            estimatedSpent: 0,
          }),
        })
      );
    });
  });
});
