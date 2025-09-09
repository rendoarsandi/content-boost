// File ini dijalankan sebelum setiap file tes.
// Gunakan untuk setup global, misalnya:
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Provide jest compatibility
global.jest = {
  fn: vi.fn,
  spyOn: vi.spyOn,
  mock: vi.mock,
  unmock: vi.unmock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
} as any;

// Mock crypto for Node.js environment
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = await import('crypto');
  global.crypto = webcrypto as any;
}
