import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer-when-downgrade",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.maitri.app",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.vercel-storage.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org http://tile.openstreetmap.org http://*.tile.openstreetmap.org https://*.openstreetmap.org http://*.openstreetmap.org https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com http://*.basemaps.cartocdn.com https://*.cartocdn.com https://unpkg.com https://cdnjs.cloudflare.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.clerk.accounts.dev https://clerk.maitri.app https://*.vercel-storage.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org http://tile.openstreetmap.org http://*.tile.openstreetmap.org https://*.openstreetmap.org http://*.openstreetmap.org https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.cartocdn.com https://unpkg.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

