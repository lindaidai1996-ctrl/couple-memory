import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from "next";
import { LEGACY_PUBLIC_STORY_SEGMENT, PUBLIC_STORY_SEGMENT } from './src/lib/public-routes'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  async redirects() {
    return [
      {
        source: `/${LEGACY_PUBLIC_STORY_SEGMENT}/:path*`,
        destination: `/${PUBLIC_STORY_SEGMENT}/:path*`,
        permanent: true,
      },
    ]
  },
};

export default withNextIntl(nextConfig);
