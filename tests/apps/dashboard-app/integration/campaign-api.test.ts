import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  GET as getCampaigns,
  POST as createCampaign,
} from '../../../app/api/campaigns/route';
import {
  GET as getCampaign,
  PUT as updateCampaign,
  DELETE as deleteCampaign,
} from '../../../app/api/campaigns/[id]/route';
import { db } from '@repo/database';
import { campaigns, campaignMaterials } from '@repo/database';

// Mock Next.js auth
vi.mock('@repo/auth/server-only', () => ({
  auth: vi.fn(),
  getSession: vi.fn(),
}));

// Mock database
vi.mock('@repo/database', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: 'test-campaign-id' }])),
        orderBy: vi.fn(() => Promise.resolve([{ id: 'test-campaign-id' }])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'test-campaign-id' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([{ id: 'test-campaign-id', status: 'active' }])
          ),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
  campaigns: {},
  campaignMaterials: {},
}));

// Import auth mock to manipulate it
import { auth, getSession } from '@repo/auth/server-only';

describe('Campaign API Integration Tests', () => {
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

  const mockAdminSession = {
    user: {
      id: 'test-admin-id',
      role: 'admin',
      name: 'Test Admin',
      email: 'admin@test.com',
    },
  };

  const mockCampaign = {
    id: 'test-campaign-id',
    creatorId: 'test-creator-id',
    title: 'Test Campaign',
    description: 'Test Description',
    budget: '1000',
    ratePerView: '10',
    status: 'draft',
    requirements: ['Test Requirement'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/campaigns', () => {
    test('should return 401 when not authenticated', async () => {
      // Mock unauthenticated session
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/campaigns');
      const response = await getCampaigns(request);

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

      const request = new NextRequest('http://localhost/api/campaigns');
      const response = await getCampaigns(request);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Forbidden - Only creators can access campaigns',
        })
      );
    });

    test('should return campaigns for authenticated creator', async () => {
      // Mock creator session
      vi.mocked(getSession).mockResolvedValueOnce(mockCreatorSession);

      // Mock database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockCampaign]),
          }),
        }),
      } as any);

      const request = new NextRequest('http://localhost/api/campaigns');
      const response = await getCampaigns(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(
        expect.objectContaining({
          campaigns: expect.arrayContaining([
            expect.objectContaining({
              id: 'test-campaign-id',
            }),
          ]),
        })
      );
    });
  });

  describe('POST /api/campaigns', () => {
    test('should return 401 when not authenticated', async () => {
      // Mock unauthenticated session
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await createCampaign(request);

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

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await createCampaign(request);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Forbidden - Only creators can create campaigns',
        })
      );
    });

    test('should return 400 when validation fails', async () => {
      // Mock creator session
      vi.mocked(getSession).mockResolvedValueOnce(mockCreatorSession);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          title: '',
          budget: -100,
        }),
      });
      const response = await createCampaign(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Validation error',
        })
      );
    });

    test('should return 400 when budget is too low for rate', async () => {
      // Mock creator session
      vi.mocked(getSession).mockResolvedValueOnce(mockCreatorSession);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          description: 'Test Description',
          budget: 5,
          ratePerView: 10, // Budget too low for rate
        }),
      });
      const response = await createCampaign(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Budget too low for the specified rate per view',
        })
      );
    });

    test('should create campaign successfully', async () => {
      // Mock creator session
      vi.mocked(getSession).mockResolvedValueOnce(mockCreatorSession);

      // Mock database insert
      vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCampaign]),
        }),
      } as any);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          description: 'Test Description',
          budget: 1000,
          ratePerView: 10,
          requirements: ['Test Requirement'],
        }),
      });
      const response = await createCampaign(request);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          campaign: expect.objectContaining({
            id: 'test-campaign-id',
          }),
          message: 'Campaign created successfully',
        })
      );
    });
  });

  describe('GET /api/campaigns/[id]', () => {
    test('should return 401 when not authenticated', async () => {
      // Mock unauthenticated session
      vi.mocked(auth).mockResolvedValueOnce(null);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id'
      );
      const response = await getCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );
    });

    test('should return 404 when campaign not found', async () => {
      // Mock creator session
      vi.mocked(auth).mockResolvedValueOnce(mockCreatorSession);

      // Mock empty database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/non-existent-id'
      );
      const response = await getCampaign(request, {
        params: { id: 'non-existent-id' },
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Campaign not found',
        })
      );
    });

    test("should return 403 when creator tries to access another creator's campaign", async () => {
      // Mock creator session
      vi.mocked(auth).mockResolvedValueOnce(mockCreatorSession);

      // Mock campaign with different creator ID
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              ...mockCampaign,
              creatorId: 'different-creator-id',
            },
          ]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id'
      );
      const response = await getCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Forbidden - You can only access your own campaigns',
        })
      );
    });

    test('should return campaign with materials for creator', async () => {
      // Mock creator session
      vi.mocked(auth).mockResolvedValueOnce(mockCreatorSession);

      // Mock campaign database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCampaign]),
        }),
      } as any);

      // Mock materials database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 'test-material-id',
              campaignId: 'test-campaign-id',
              type: 'youtube',
              url: 'https://youtube.com/test',
              title: 'Test Material',
            },
          ]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id'
      );
      const response = await getCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(
        expect.objectContaining({
          campaign: expect.objectContaining({
            id: 'test-campaign-id',
            materials: expect.arrayContaining([
              expect.objectContaining({
                id: 'test-material-id',
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('PUT /api/campaigns/[id]', () => {
    test('should return 401 when not authenticated', async () => {
      // Mock unauthenticated session
      vi.mocked(auth).mockResolvedValueOnce(null);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'PUT',
          body: JSON.stringify({}),
        }
      );
      const response = await updateCampaign(request, {
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
      vi.mocked(auth).mockResolvedValueOnce(mockPromoterSession);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'PUT',
          body: JSON.stringify({}),
        }
      );
      const response = await updateCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Forbidden - Only creators can update campaigns',
        })
      );
    });

    test('should return 404 when campaign not found or not owned by creator', async () => {
      // Mock creator session
      vi.mocked(auth).mockResolvedValueOnce(mockCreatorSession);

      // Mock empty database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Campaign',
          }),
        }
      );
      const response = await updateCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Campaign not found or access denied',
        })
      );
    });

    test('should return 400 when invalid status transition', async () => {
      // Mock creator session
      vi.mocked(auth).mockResolvedValueOnce(mockCreatorSession);

      // Mock campaign database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              ...mockCampaign,
              status: 'draft',
            },
          ]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'PUT',
          body: JSON.stringify({
            status: 'paused', // Invalid transition from draft to paused
          }),
        }
      );
      const response = await updateCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Invalid status transition from draft to paused',
        })
      );
    });

    test('should update campaign successfully', async () => {
      // Mock creator session
      vi.mocked(auth).mockResolvedValueOnce(mockCreatorSession);

      // Mock campaign database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCampaign]),
        }),
      } as any);

      // Mock update response
      vi.mocked(db.update).mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...mockCampaign,
                title: 'Updated Campaign',
                status: 'active',
              },
            ]),
          }),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Campaign',
            status: 'active',
          }),
        }
      );
      const response = await updateCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          campaign: expect.objectContaining({
            id: 'test-campaign-id',
            title: 'Updated Campaign',
            status: 'active',
          }),
          message: 'Campaign updated successfully',
        })
      );
    });
  });

  describe('DELETE /api/campaigns/[id]', () => {
    test('should return 401 when not authenticated', async () => {
      // Mock unauthenticated session
      vi.mocked(auth).mockResolvedValueOnce(null);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'DELETE',
        }
      );
      const response = await deleteCampaign(request, {
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
      vi.mocked(auth).mockResolvedValueOnce(mockPromoterSession);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'DELETE',
        }
      );
      const response = await deleteCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Forbidden - Only creators can delete campaigns',
        })
      );
    });

    test('should return 404 when campaign not found or not owned by creator', async () => {
      // Mock creator session
      vi.mocked(auth).mockResolvedValueOnce(mockCreatorSession);

      // Mock empty database response
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'DELETE',
        }
      );
      const response = await deleteCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Campaign not found or access denied',
        })
      );
    });

    test('should return 400 when trying to delete non-draft campaign', async () => {
      // Mock creator session
      vi.mocked(auth).mockResolvedValueOnce(mockCreatorSession);

      // Mock campaign database response with active status
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              ...mockCampaign,
              status: 'active',
            },
          ]),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'DELETE',
        }
      );
      const response = await deleteCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: 'Only draft campaigns can be deleted',
        })
      );
    });

    test('should delete campaign successfully', async () => {
      // Mock creator session
      vi.mocked(auth).mockResolvedValueOnce(mockCreatorSession);

      // Mock campaign database response with draft status
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              ...mockCampaign,
              status: 'draft',
            },
          ]),
        }),
      } as any);

      // Mock delete response
      vi.mocked(db.delete).mockReturnValueOnce({
        where: vi.fn().mockResolvedValue(undefined),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/campaigns/test-campaign-id',
        {
          method: 'DELETE',
        }
      );
      const response = await deleteCampaign(request, {
        params: { id: 'test-campaign-id' },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          message: 'Campaign deleted successfully',
        })
      );
    });
  });
});
