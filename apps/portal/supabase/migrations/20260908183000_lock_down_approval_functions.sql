-- Follow-up to 20260908180000_mentor_signup_approval.sql.
--
-- Supabase's security advisor flagged both new functions as callable over the
-- public REST API. PostgREST exposes every executable function in the `public`
-- schema at /rest/v1/rpc/<name>, and both had the default PUBLIC grant.

-- `protect_approval_status` is a trigger function. The trigger invokes it as the
-- table owner, so no role needs EXECUTE on it -- it was only ever reachable as
-- an RPC by accident, and it is SECURITY DEFINER.
revoke all on function public.protect_approval_status() from public, anon, authenticated;

-- `is_approved()` answers "am I approved?" about the caller, so a signed-in
-- account may ask -- it is the same check the RLS policies use. An anonymous
-- caller can never be approved, so that endpoint returned a constant false.
revoke all on function public.is_approved() from public, anon;
grant execute on function public.is_approved() to authenticated;
