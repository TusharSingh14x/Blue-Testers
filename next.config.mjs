/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow cross-origin requests from local network during development
  // Add your local network IP address here if accessing from other devices
  allowedDevOrigins: process.env.NODE_ENV === 'development' 
    ? ['192.168.137.119', 'localhost', '127.0.0.1'] 
    : [],
}

export default nextConfig
