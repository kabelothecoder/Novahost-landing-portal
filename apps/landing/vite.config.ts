import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// The marketing site. No Supabase client, no auth, no router guards — if this
// app ever needs a session, something has been put on the wrong domain.
export default defineConfig({
  server: { host: "::", port: 3000 },
  plugins: [react()],
  resolve: {
    // The workspace root hoists another React for the other apps. Pin this
    // app's own copy or hooks blow up on a second instance.
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@novahost/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
});
