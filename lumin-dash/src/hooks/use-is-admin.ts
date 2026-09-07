import { useEffect, useState } from "react";
import { novaHost } from "@/integrations/novahost/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * True when the signed-in account is in `public.admin_users`.
 *
 * Resolved through the `is_admin()` SQL function (SECURITY DEFINER, reads
 * `admin_users` off `auth.uid()`), which is the same check every admin RLS
 * policy and the `admin-grant-access` edge function use. Purely for hiding UI
 * that a non-admin could not use anyway — the real enforcement is server-side.
 */
export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    // `is_admin` is not in the generated RPC types; the cast keeps `tsc` quiet.
    (novaHost.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>)("is_admin")
      .then(({ data, error }) => {
        if (cancelled) return;
        setIsAdmin(!error && data === true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsAdmin(false);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
}
