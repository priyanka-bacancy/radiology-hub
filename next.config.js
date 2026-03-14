/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    optimizePackageImports: [
      '@cornerstonejs/core',
      '@cornerstonejs/tools',
      '@cornerstonejs/dicom-image-loader'
    ]
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
}

module.exports = nextConfig
