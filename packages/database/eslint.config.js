// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
  {
    // Globally ignored files
    ignores: ['**/node_modules/', '**/dist/', '**/*.config.js', 'src/**/*.js', 'src/**/*.d.ts'],
  },
  {
    // Base configuration for all files
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'prefer-const': 'off',
      'no-var': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-case-declarations': 'off',
    },
  }
);
