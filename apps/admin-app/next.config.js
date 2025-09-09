/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@repo/ui',
    '@repo/config',
    '@repo/database',
    '@repo/cache',
    '@repo/utils',
  ],
  output: 'standalone',
  experimental: {
    esmExternals: 'loose',
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  webpack: (config, { isServer }) => {
    // Ignore Node.js modules when building for client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
