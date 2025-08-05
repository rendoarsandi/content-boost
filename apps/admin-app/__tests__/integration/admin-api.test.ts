import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST as unbanUser } from '../../../app/api/users/[id]/unban/route';
import { db } from '@repo/database';
import { users } from '@repo/database/schemas';
import { eq } from 'drizzle-orm';

// Mock Next.js auth
vi.mock('@repo/auth/server-only', () => ({
  auth: vi.fn(),
  getSession: vi.fn(),
}));

// Mock database
vi.mock('@repo/database', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
  users: {},
}));

// Mock console.log to verify logging
const originalConsoleLog = console.log;
console.log = vi.fn();

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Restore console.log
    console.log = originalConsoleLog;
  });

  describe('POST /api/users/[id]/unban', () => {
    test('should unban user successfully', async () => {
      // Mock database update
      vi.mocked(db.update).mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const userId = 'test-user-id';
      const request = new NextRequest(
        `http://localhost/api/users/${userId}/unban`,
        {
          method: 'POST',
        }
      );
      const response = await unbanUser(request, { params: { id: userId } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          message: 'User unbanned successfully',
        })
      );

      // Verify database update was called with correct parameters
      expect(db.update).toHaveBeenCalledTimes(1);
      expect(
        vi.mocked(db.update).mock.results[0].value.set
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );

      // Verify logging
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`User ${userId} has been unbanned by admin`)
      );
    });

    test('should handle database error', async () => {
      // Mock database error
      vi.mocked(db.update).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const userId = 'test-user-id';
      const request = new NextRequest(
        `http://localhost/api/users/${userId}/unban`,
        {
          method: 'POST',
        }
      );
      const response = await unbanUser(request, { params: { id: userId } });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          message: 'Failed to unban user',
        })
      );
    });
  });
});
