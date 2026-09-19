-- Every mentor was being shown the whole platform.
--
-- Three separate holes, all of which predate version control -- none of these
-- objects appear in this folder, so they were made in the dashboard and the
-- migrations here never described the database that was actually running:
--
--   1. `get_dashboard_stats()` is SECURITY DEFINER and counted every row in
--      `licenses`, `profiles` and `device_activations` with no reference to the
--      caller. A mentor who had issued two keys opened the dashboard and read
--      "Active licenses: 82" -- the platform total. That is the reported bug.
--
--   2. `expert_advisors` carried "Authenticated users can read products"
--      USING (true) alongside the owner-scoped policy added in
--      20260609181100_multi_tenancy_rls.sql. Policies are OR'd, so one `true`
--      erases the scoped one next to it: every signed-in mentor could read
--      every other mentor's robots, including `symbols` and `tts_script`.
--
--   3. `plans` had the same blanket SELECT, plus an INSERT policy with
--      WITH CHECK (true) -- any mentor could attach a plan to a robot they do
--      not own.
--
-- `licenses`, `device_activations` and `profiles` were already owner-scoped and
-- are left alone; verified against live data, no licence key was ever readable
-- across accounts. It was the counts, the robots and the plans.

BEGIN;

-- 1. Robots ------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can read products" ON public.expert_advisors;

-- 2. Plans -------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can read plans" ON public.plans;
DROP POLICY IF EXISTS "Authenticated users can insert plans" ON public.plans;

-- The surviving SELECT policy ("Users can view plans for their expert
-- advisors") already scopes reads through `product_id`, which is NOT NULL, so
-- no plan becomes unreachable. Writes now have to clear the same join.
--
-- Nothing in the portal inserts a plan from the browser: `manage-eas` creates
-- the default Lifetime plan with the service role, which is unaffected by RLS.
-- This policy exists so the table is not silently write-open.
CREATE POLICY "Users insert plans for their expert advisors"
  ON public.plans FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expert_advisors ea
      WHERE ea.id = plans.product_id AND ea.user_id = auth.uid()
    )
  );

-- `licenses` and `expert_advisors` both have an admin policy; `plans` had none,
-- and was relying on the blanket read this migration removes.
CREATE POLICY "Admins manage plans"
  ON public.plans FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Dashboard stats ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_mentor    uuid := auth.uid();
    v_issued    int;
    v_active    int;
    v_live      int;
    v_devices   int;
BEGIN
    -- No session means no rows belong to the caller. Zero, never the platform
    -- total: that substitution is the whole bug this migration exists to fix.
    IF v_mentor IS NULL THEN
        RETURN jsonb_build_object(
            'active_licenses', 0, 'keys_issued', 0,
            'live_fleet', 0, 'devices_linked', 0,
            'total_licenses', 0, 'total_users', 0, 'managed_equity', 0
        );
    END IF;

    SELECT count(*), count(*) FILTER (WHERE status = 'active')
      INTO v_issued, v_active
      FROM public.licenses
     WHERE user_id = v_mentor;

    -- Counted DISTINCT on `device_id`: a handset that reactivates leaves more
    -- than one row per licence, and a fleet size that climbs on reinstall is
    -- not a fleet size.
    SELECT count(DISTINCT d.device_id) FILTER (WHERE d.last_seen_at > now() - interval '5 minutes'),
           count(DISTINCT d.device_id)
      INTO v_live, v_devices
      FROM public.device_activations d
      JOIN public.licenses l ON l.id = d.license_id
     WHERE l.user_id = v_mentor;

    RETURN jsonb_build_object(
        'active_licenses', v_active,
        'keys_issued',     v_issued,
        'live_fleet',      v_live,
        'devices_linked',  v_devices,

        -- Legacy keys. The portal build in production reads `total_licenses`,
        -- `total_users` and `managed_equity`, and formats a missing value as
        -- "NaN", so the database cannot change shape ahead of the deploy.
        -- `managed_equity` summed `broker_accounts`, which holds zero rows and
        -- is dead -- balances travel through the `broker-account` function now
        -- -- so that tile has been rendering $0 for every mentor since it
        -- shipped. It is dropped from the new KPI row rather than scoped.
        'total_licenses',  v_active,
        'total_users',     v_devices,
        'managed_equity',  0
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM anon;

COMMIT;
