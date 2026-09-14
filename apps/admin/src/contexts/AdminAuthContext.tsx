import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { novaHost } from "@/integrations/novahost/client";

/**
 * Session plus one extra fact: is this account an admin?
 *
 * Resolved through the `is_admin()` SQL function (SECURITY DEFINER, reads
 * `public.admin_users` off `auth.uid()`) — the same check every admin RLS
 * policy and every admin edge function runs. Here it decides whether the app
 * renders at all; there it decides whether anything actually happens. Only the
 * second one is enforcement. This is a locked front door on a building whose
 * every room is also locked.
 */
interface AdminAuthValue {
  user: User | null;
  session: Session | null;
  /** True while the session is still being resolved. */
  loading: boolean;
  /** Null until known. Do not treat null as false — the gate flashes. */
  isAdmin: boolean | null;
  adminLoading: boolean;
  /** Why the check failed, when it failed. Null when it simply answered "no". */
  adminError: string | null;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | undefined>(undefined);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    // Listener first, then the existing session — the other order can miss an
    // event that fires between the two calls.
    const {
      data: { subscription },
    } = novaHost.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    });

    novaHost.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = user?.id ?? null;

  const checkAdmin = useCallback(async () => {
    if (!userId) {
      setIsAdmin(null);
      setAdminError(null);
      setAdminLoading(false);
      return;
    }

    setAdminLoading(true);
    setAdminError(null);

    /*
     * Call it as a METHOD, not as a detached function.
     *
     * `const rpc = novaHost.rpc; rpc("is_admin")` looks equivalent and is not:
     * pulling the method off the client into a plain variable loses `this`, and
     * supabase-js needs `this` to reach the project URL, the headers and the
     * signed-in user's token. It throws, and because the old code caught that
     * and fell through to `setIsAdmin(false)`, a real admin was told they were
     * not one. Casting the CLIENT and calling `client.rpc(...)` keeps the
     * receiver intact.
     *
     * (`is_admin` is absent from the generated types, which is the only reason
     * a cast is involved at all.)
     */
    const client = novaHost as unknown as {
      rpc: (fn: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
    };

    try {
      const { data, error } = await client.rpc("is_admin");

      if (error) {
        // Fail closed, but do NOT claim they are not an admin. "We could not
        // check" and "you are not allowed" are different answers, and showing
        // the second when the first is true sends someone hunting through the
        // database for a row that was there all along.
        setIsAdmin(false);
        setAdminError(error.message || "Could not verify admin access.");
        return;
      }

      setIsAdmin(data === true);
    } catch (err) {
      setIsAdmin(false);
      setAdminError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdminLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    void checkAdmin();
  }, [loading, checkAdmin]);

  const signOut = async () => {
    setIsAdmin(null);
    await novaHost.auth.signOut();
  };

  return (
    <AdminAuthContext.Provider
      value={{ user, session, loading, isAdmin, adminLoading, adminError, signOut }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
