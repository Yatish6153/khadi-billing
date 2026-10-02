const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /** Hide the Next.js "N" developer badge in the corner */
  devIndicators: false,
  /**
   * Let phones / other computers on the shop Wi-Fi open the app
   * (e.g. http://192.168.1.9:3000) while it runs in dev mode.
   */
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*'],
  /**
   * Proxy every /api/* request to the Express backend. The browser only ever
   * talks to the frontend's own origin, so the auth cookie is first-party
   * (works in Safari/Firefox with third-party cookies blocked) and no CORS
   * is needed in production.
   */
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
