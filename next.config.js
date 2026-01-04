/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['jspdf', 'jspdf-autotable'],
  },
}

module.exports = nextConfig
