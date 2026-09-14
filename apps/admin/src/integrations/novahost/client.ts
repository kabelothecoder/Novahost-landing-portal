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

/**
 * Which required variables are missing, or empty when the app is configured.
 *
 * This used to `throw` here. Throwing at module scope in a Vite bundle renders
 * a blank white page with the reason buried in the console, and the build still
 * reports success — which is exactly how a misconfigured deploy cost an hour on
 * this project once already. The specific trap: a `VITE_`-prefixed variable set
 * as a Vercel **Secret** is deliberately withheld from the browser bundle and
 * arrives as `undefined`, so the deploy looks green and the site is dead.
 *
 * So the failure is reported rather than thrown, and `main.tsx` renders
 * something that says what to fix.
 */
export const missingConfig: string[] = [
  !API_URL && "VITE_SUPABASE_URL",
  !API_KEY && "VITE_SUPABASE_PUBLISHABLE_KEY",
].filter(Boolean) as string[];

/**
 * The placeholders keep `createClient` from throwing on an unconfigured
 * deploy. Nothing ever calls through them: `main.tsx` renders the
 * configuration screen instead of the app whenever `missingConfig` is
 * non-empty.
 */
export const novaHost = createClient<Database>(
  API_URL || "https://unconfigured.invalid",
  API_KEY || "unconfigured",
  {
    auth: {
      // A distinct storage key so signing into admin in one tab does not stomp
      // a mentor session in another. Different domains anyway, but this makes
      // the separation true even on localhost.
      storageKey: "novahost-admin-auth",
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
