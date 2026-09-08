import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// The VITE_SUPABASE_* names are what Vercel has configured for this project.
// Renaming them here would silently hand `undefined` to createClient on the
// deployed site, so they stay until the dashboard is changed to match.
const API_URL = import.meta.env.VITE_SUPABASE_URL;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!API_URL || !API_KEY) {
  throw new Error('NovaHost backend initialisation failed: missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables.');
}

// Import the client like this:
// import { novaHost } from "@/integrations/novahost/client";

export const novaHost = createClient<Database>(API_URL, API_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
