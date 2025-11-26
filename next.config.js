/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Vercel deployment, we'll use standard Next.js
  // API routes will be handled by separate Express backend on Render
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig

