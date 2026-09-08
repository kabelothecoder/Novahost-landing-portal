import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// The portal ships two ways:
//   web (default) — the /mentor/* zone of novahost.<tld>. Built assets and the
//     SPA live under /mentor/, and the output goes to dist/mentor/ so the file
//     at /mentor/assets/x is served by that exact path on the portal's Vercel
//     project (Next.js multi-zone rewrite from the landing).
//   app — inside a Capacitor shell that serves from the web root. Set
//     PORTAL_TARGET=app to build with a "/" base and a flat dist/.
const forApp = process.env.PORTAL_TARGET === "app";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: forApp ? "/" : "/mentor/",
  build: {
    outDir: forApp ? "dist" : "dist/mentor",
    emptyOutDir: true,
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    // In the workspace the parent node_modules has a different React (19, for the
    // landing). Force every `react` / `react-dom` import to this app's own copy
    // (18) so hooks don't blow up on a second React instance.
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Workspace package, resolved straight to source (no build step).
      "@novahost/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
}));
