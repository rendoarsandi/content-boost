import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];
