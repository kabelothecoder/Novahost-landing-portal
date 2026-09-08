import type { NextConfig } from "next";

// The mentor portal (apps/portal, a Vite SPA) is its own Vercel project with no
// domain of its own. It is served to the world only through these rewrites, as
// the /mentor/* zone of this site. Set PORTAL_ORIGIN in the landing's Vercel
// project to the portal deployment's URL; the fallback is its current auto-URL.
const PORTAL_ORIGIN = process.env.PORTAL_ORIGIN ?? "https://lumin-dash-6c2x.vercel.app";

const nextConfig: NextConfig = {
  // `@novahost/shared` ships raw .ts from the workspace; Next must transpile it.
  transpilePackages: ["@novahost/shared"],

  async rewrites() {
    // `beforeFiles` so /mentor/* always reaches the portal, shadowing the
    // half-built app/mentor/* stub in this app.
    return {
      beforeFiles: [
        { source: "/mentor", destination: `${PORTAL_ORIGIN}/mentor` },
        { source: "/mentor/:path*", destination: `${PORTAL_ORIGIN}/mentor/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
