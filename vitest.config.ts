import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    alias: {
      '@repo/ui': path.resolve(__dirname, 'packages/ui/src'),
      '@repo/database': path.resolve(__dirname, 'packages/database/src'),
      '@repo/cache': path.resolve(__dirname, 'packages/cache/src'),
      '@repo/utils': path.resolve(__dirname, 'packages/utils/src'),
      '@repo/config': path.resolve(__dirname, 'packages/config/src'),
      '@repo/auth': path.resolve(__dirname, 'packages/auth/src'),
    },
    // Jest compatibility
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  define: {
    // Provide jest globals for compatibility
    global: 'globalThis',
  },
});
