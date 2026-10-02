import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Dev local tras proxy Apache (erp.local): el dev server solo acepta
  // localhost por defecto y responde "Unauthorized" al HMR cross-host.
  allowedDevOrigins: ["erp.local", "192.168.2.10"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Diagramas interactivos de /docs embebidos en iframe mismo-origen.
        // Va DESPUÉS de la regla global para prevalecer sobre DENY.
        // SAMEORIGIN mantiene la protección anti-clickjacking externa.
        source: "/docs/flujos/:path*",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
