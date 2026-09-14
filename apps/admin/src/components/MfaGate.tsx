import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { novaHost } from "@/integrations/novahost/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Two-factor, and the only way into the console.
 *
 * The admin console reads every rand the business has taken and can grant free
 * access to the product, so a password on its own is one leak away from all of
 * it. Supabase models this as assurance levels: `aal1` is "knows the
 * password", `aal2` is "also just proved possession of the authenticator".
 *
 * Three states, decided by `getAuthenticatorAssuranceLevel()`:
 *
 *   nextLevel aal1  → no verified factor exists → enroll one, right now
 *   current aal1, next aal2 → factor exists, this session has not used it → challenge
 *   current aal2    → in
 *
 * Enrolment is deliberately not skippable. An admin who could postpone it
 * would postpone it forever, and the window where the console is protected by
 * a password alone is exactly the window somebody walks through.
 *
 * This component only ever calls `auth.mfa.*`, which works at aal1 — so the
 * server-side aal2 requirement on the admin edge functions cannot lock the
 * first admin out of enrolling. That ordering is load-bearing; do not "tidy"
 * it by fetching console data here.
 */

type Phase = "checking" | "enroll" | "challenge" | "passed";

/** Digits only, capped at six — a TOTP code is never anything else. */
const clean = (v: string) => v.replace(/\D/g, "").slice(0, 6);

export function MfaGate({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAdminAuth();

  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  // Enrolment material. `secret` is shown as a typable fallback for anyone
  // whose authenticator cannot scan, or who is reading this on the same device.
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  // StrictMode double-invokes effects in development; enrolling twice leaves an
  // orphan unverified factor behind and the second enroll can collide.
  const started = useRef(false);

  const resolve = useCallback(async () => {
    setError(null);
    const { data, error: aalError } = await novaHost.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      setError(aalError.message);
      setPhase("challenge");
      return;
    }

    if (data?.currentLevel === "aal2") {
      setPhase("passed");
      return;
    }
    if (data?.nextLevel === "aal2") {
      setPhase("challenge");
      // Which factor to challenge. There is normally exactly one.
      const { data: factors } = await novaHost.auth.mfa.listFactors();
      const verified = factors?.totp?.find((f) => f.status === "verified");
      setFactorId(verified?.id ?? null);
      return;
    }

    setPhase("enroll");
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void resolve();
  }, [resolve]);

  /** Mint a fresh TOTP factor and show its QR. */
  const beginEnrol = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      // An abandoned enrolment leaves an unverified factor behind, and the next
      // enroll collides with its friendly name. Clear those first — an
      // unverified factor protects nothing, so dropping it loses nothing.
      const { data: existing } = await novaHost.auth.mfa.listFactors();
      for (const f of existing?.all ?? []) {
        if (f.status === "unverified") {
          await novaHost.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data, error: enrollError } = await novaHost.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `NovaHost Admin · ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollError) throw enrollError;

      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (phase === "enroll" && !factorId && !busy) void beginEnrol();
  }, [phase, factorId, busy, beginEnrol]);

  /** Verify a six-digit code. Same call for enrolment and for a challenge —
   *  the first one also marks the factor verified. */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;

    setBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await novaHost.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (verifyError) throw verifyError;

      // The session is now aal2. Re-resolve rather than assuming, so the gate
      // and the server agree on what just happened.
      setCode("");
      await resolve();
    } catch (err) {
      setCode("");
      setError(
        err instanceof Error
          ? // The raw message for a wrong code is unhelpfully technical.
            /invalid|incorrect|expired/i.test(err.message)
            ? "That code was not accepted. Codes expire every 30 seconds — try the current one."
            : err.message
          : String(err),
      );
    } finally {
      setBusy(false);
    }
  };

  if (phase === "passed") return <>{children}</>;

  if (phase === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const enrolling = phase === "enroll";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-[420px]">
        <CardContent className="p-7">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-muted dark:bg-primary/15">
              {enrolling ? (
                <ShieldAlert className="h-5 w-5 text-primary" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-primary" />
              )}
            </span>
            <h1 className="mt-4 text-[18px] font-semibold tracking-tight">
              {enrolling ? "Set up two-factor" : "Two-factor required"}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {enrolling
                ? "This console can see every payment the business has taken and can grant free access to the product. A password alone is not enough to open it."
                : "Enter the six-digit code from your authenticator app."}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-5">
              <AlertDescription className="text-[13px]">{error}</AlertDescription>
            </Alert>
          )}

          {enrolling && (
            <div className="mt-6">
              {qr ? (
                <>
                  <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                    {/* Supabase returns the QR as an SVG data URL. */}
                    <img src={qr} alt="Two-factor setup QR code" width={180} height={180} />
                  </div>
                  <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
                    Scan this with Google Authenticator, 1Password, Authy or similar. If you cannot
                    scan it, enter this key by hand:
                  </p>
                  {secret && (
                    <code className="mt-2 block break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-[12px]">
                      {secret}
                    </code>
                  )}
                </>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="totp">Six-digit code</Label>
              <Input
                id="totp"
                value={code}
                onChange={(e) => setCode(clean(e.target.value))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                placeholder="000000"
                autoFocus
                className="text-center font-mono text-[20px] tracking-[0.4em]"
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy || code.length !== 6 || !factorId}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {enrolling ? "Turn on two-factor" : "Verify"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="truncate text-[12px] text-muted-foreground" title={user?.email ?? ""}>
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" className="shrink-0 gap-1.5" onClick={() => void signOut()}>
              <KeyRound className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
