import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000/api',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api', // للاستخدام في المتصفح
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_BASE_URL || 'http://localhost:4000/api'}/:path*`,
      },
    ];
  },
  // Fix webpack.js file access errors by writing dev bundles to disk
  webpackDevMiddleware: (config: any) => {
    config.writeToDisk = true;
    return config;
  },
};

export default nextConfig;
