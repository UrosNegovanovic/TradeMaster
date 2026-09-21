/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.openfoodfacts.org',
        pathname: '/images/products/**',
      },
      {
        protocol: 'https',
        hostname: 'images.openbeautyfacts.org',
        pathname: '/images/products/**',
      },
      {
        protocol: 'https',
        hostname: 'images.openproductsfacts.org',
        pathname: '/images/products/**',
      },
      // UPCitemdb image sources (Walmart, Amazon, eBay, etc.)
      {
        protocol: 'https',
        hostname: '**.walmartimages.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ssl-images-amazon.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.media-amazon.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ebayimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.target.com',
        pathname: '/**',
      },
      // CDN for scanned product images
      {
        protocol: 'https',
        hostname: 's.cdnsbn.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
  },

  // Security and performance headers
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Prevents clickjacking attacks
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Prevents MIME type sniffing
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // XSS protection for older browsers
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()', // Allow camera for barcode scanning, block others
          },
        ],
      },
    ]
  },
};

module.exports = nextConfig;
