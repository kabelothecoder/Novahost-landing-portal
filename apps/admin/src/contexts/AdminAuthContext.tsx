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
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }

    setAdminLoading(true);
    // `is_admin` is not in the generated RPC types; the cast keeps tsc quiet.
    const rpc = novaHost.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: unknown; error: unknown }>;

    try {
      const { data, error } = await rpc("is_admin");
      // Fail closed. A read error means we cannot prove this account is an
      // admin, and letting it through would defeat the point of asking.
      setIsAdmin(!error && data === true);
    } catch {
      setIsAdmin(false);
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
      value={{ user, session, loading, isAdmin, adminLoading, signOut }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
