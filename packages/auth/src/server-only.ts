// packages/auth/src/server-only.ts
import "server-only";
import type { Session } from "./config";

/**
 * Mengembalikan sesi pengguna palsu untuk tujuan build dan pengembangan.
 * Otentikasi nyata perlu diimplementasikan kembali dengan library yang kompatibel dengan Prisma.
 */
export const getSession = async (): Promise<Session | null> => {
  return {
    user: {
      id: 'clx5e1a0b0000t7p8h4g9f8d6', // ID pengguna dummy
      name: 'Test Creator',
      email: 'creator@example.com',
      role: 'creator',
    },
    expires: new Date(Date.now() + 3600 * 1000), // Kedaluwarsa dalam 1 jam
  };
};

export const getCurrentUser = async () => {
  const session = await getSession();
  return session?.user || null;
};

// Guard palsu yang selalu lolos
export const requireAuth = async () => {
  return await getSession();
};

// Alias for getSession to match expected import
export const auth = getSession;
