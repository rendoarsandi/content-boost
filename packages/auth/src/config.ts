// packages/auth/src/config.ts

// Logika better-auth telah dinonaktifkan sementara
// untuk memungkinkan migrasi ke Prisma.

export type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
};

export type Session = {
  user: User | null;
  accessToken?: string;
  expires: Date;
};

// Ekspor kosong untuk menjaga kompatibilitas impor
export const auth = {};
