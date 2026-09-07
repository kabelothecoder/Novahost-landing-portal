import { createClient } from "@supabase/supabase-js";

// The NEXT_PUBLIC_SUPABASE_* names are what Vercel has configured for this
// project. Renaming them here would silently fall through to the placeholder
// below on the deployed site, so they stay until the dashboard is changed.
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

export const novaHost = createClient(apiUrl, apiKey);
