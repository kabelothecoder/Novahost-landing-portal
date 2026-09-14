import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * The admin app's Supabase client.
 *
 * Same project, same publishable key, same RLS as everything else — being an
 * admin is a property of the signed-in account (`public.admin_users`), never a
 * property of this bundle. Nothing here is privileged: every admin action goes
 * through an edge function that re-checks `admin_users` server-side, because
 * this file ships to a browser and a browser cannot be trusted with authority.
 */
const API_URL = import.meta.env.VITE_SUPABASE_URL;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!API_URL || !API_KEY) {
  throw new Error(
    "NovaHost admin initialisation failed: missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.",
  );
}

export const novaHost = createClient<Database>(API_URL, API_KEY, {
  auth: {
    // A distinct storage key so signing into admin in one tab does not stomp a
    // mentor session in another. Different domains anyway, but this makes the
    // separation true even on localhost.
    storageKey: "novahost-admin-auth",
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
