import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET as getTransactions } from '../../../app/api/finances/transactions/route';
import { db } from '@repo/database';
import { transactions, users } from '@repo/database/schemas';

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
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  },
  payouts: {},
  platformRevenue: {},
}));

describe('Payment API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/finances/transactions', () => {
    test('should return transactions list', async () => {
      // Mock payouts data
      const mockPayouts = [
        {
          id: 'payout-1',
          amount: '50',
          description: 'payout-1',
          status: 'completed',
          createdAt: new Date('2024-01-01'),
          processedAt: new Date('2024-01-01'),
        },
        {
          id: 'payout-2',
          amount: '30',
          description: 'payout-2',
          status: 'pending',
          createdAt: new Date('2024-01-02'),
          processedAt: null,
        },
      ];

      // Mock revenue data
      const mockRevenue = [
        {
          id: 'revenue-1',
          withdrawnAmount: 100,
          createdAt: new Date('2024-01-03'),
        },
        {
          id: 'revenue-2',
          withdrawnAmount: 0, // Should be filtered out
          createdAt: new Date('2024-01-04'),
        },
      ];

      // Mock database responses
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockPayouts),
          }),
        }),
      } as any);

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockRevenue),
          }),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/finances/transactions'
      );
      const response = await getTransactions();

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should have 3 transactions (2 payouts + 1 withdrawal with amount > 0)
      expect(data).toHaveLength(3);

      // Check transaction types
      expect(data.filter(t => t.type === 'revenue')).toHaveLength(2);
      expect(data.filter(t => t.type === 'withdrawal')).toHaveLength(1);

      // Check specific transaction
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'payout-1',
            type: 'revenue',
            amount: 50,
            status: 'completed',
          }),
          expect.objectContaining({
            id: 'revenue-1',
            type: 'withdrawal',
            amount: 100,
          }),
        ])
      );

      // Should not include revenue with zero withdrawn amount
      expect(data.some(t => t.id === 'revenue-2')).toBe(false);
    });

    test('should handle database error', async () => {
      // Mock database error
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest(
        'http://localhost/api/finances/transactions'
      );
      const response = await getTransactions();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          message: 'Failed to fetch transactions',
        })
      );
    });

    test('should handle empty results', async () => {
      // Mock empty database responses
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/finances/transactions'
      );
      const response = await getTransactions();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(0);
    });
  });
});
