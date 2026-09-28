import type { NextConfig } from 'next';

// Browser เรียก /backend/* (same-origin) แล้ว Next.js proxy ต่อไปที่ Backend จริง
// จึงไม่ต้องแก้ Backend เพื่อเปิด CORS
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/backend/:path*', destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
