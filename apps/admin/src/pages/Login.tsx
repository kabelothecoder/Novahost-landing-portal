import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { novaHost } from "@/integrations/novahost/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Sign-in for the admin console.
 *
 * No "create account" and no password reset link, on purpose. Admin accounts
 * are not self-service: a row in `public.admin_users` is what makes one, and
 * that row is added by hand. A signup form here would imply otherwise.
 *
 * Signing in successfully is not the same as getting in. An ordinary mentor
 * account authenticates perfectly well and then meets the not-an-admin screen,
 * which is the correct outcome and says so plainly.
 */
export default function Login() {
  const { user, isAdmin, adminLoading, signOut } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await novaHost.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInError) setError(signInError.message);
    setBusy(false);
  };

  // Signed in, checked, and not an admin.
  if (user && isAdmin === false && !adminLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </span>
          <h1 className="mt-4 text-[18px] font-semibold">This account is not an admin</h1>
          <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-muted-foreground">
            You signed in as <span className="font-medium text-foreground">{user.email}</span>, but
            that account is not on the admin list. If you are looking for the mentor portal, it is a
            different site.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => void signOut()}>
            Sign in as someone else
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-7 text-center">
        <img
          src="/novahost-mark.png"
          alt=""
          width={40}
          height={40}
          className="mx-auto rounded-[22%] object-cover"
        />
        <h1 className="mt-4 text-[19px] font-semibold tracking-tight">NovaHost Admin</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Revenue, entitlements and platform health.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@novahost-ea.app"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-muted-foreground">
        Admin access is granted by hand. There is no signup here.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-[380px]">
        <CardContent className="p-7">{children}</CardContent>
      </Card>
    </div>
  );
}
