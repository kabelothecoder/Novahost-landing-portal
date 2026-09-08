import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
    // landing app). Force every `react` / `react-dom` import to this app's own
    // copy (18) so hooks don't blow up on a second React instance.
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Workspace package, resolved straight to source (no build step).
      "@novahost/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
}));
