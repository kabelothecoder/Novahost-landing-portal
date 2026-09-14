import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// The mentor portal.
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    // The workspace root hoists React for the sibling apps. Pin this app's own
    // copy or a second instance gets in and hooks throw "Invalid hook call".
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Workspace package, resolved straight to source (no build step).
      "@novahost/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
});
