import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { novaHost } from "@/integrations/novahost/client";
import { toast } from "@/hooks/use-toast";
import { playWelcomeSwoosh } from "@/lib/notify";
import { cn } from "@/lib/utils";

const PENDING_MESSAGE =
  "Your account is pending approval. Every mentor signup is reviewed by hand — we'll email you as soon as yours is live.";
const REJECTED_MESSAGE =
  "Your account was not approved, so you can't sign in. Reply to your signup email if you think that's a mistake.";

/**
 * The reason this account may not use the portal, or null when it may.
 *
 * Signing in is not the same as being let in: every signup starts `pending` and
 * an admin has to approve it. Reading the caller's own row is what the
 * "Users view their own profile" RLS policy allows; writing it is what the
 * `protect_approval_status` trigger refuses.
 *
 * Fails closed. A status we cannot read is treated as not approved, because
 * letting it through is the one outcome the gate exists to prevent.
 */
async function approvalRefusal(userId: string | undefined): Promise<string | null> {
  if (!userId) return PENDING_MESSAGE;

  const { data, error } = await novaHost
    .from("profiles")
    .select("approval_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Could not read approval status:", error);
    return PENDING_MESSAGE;
  }

  const status = data?.approval_status ?? "pending";
  if (status === "approved") return null;
  return status === "rejected" ? REJECTED_MESSAGE : PENDING_MESSAGE;
}

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data, error } = await novaHost.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // The credentials were right, which is not the same as being allowed in.
      // Throw the session away again unless an admin has approved the account,
      // so an unapproved mentor never reaches the portal at all.
      //
      // This is the visible half only. The mentor edge functions run the same
      // check server-side, so even the momentary token cannot do anything.
      const refusal = await approvalRefusal(data.user?.id);
      if (refusal) {
        await novaHost.auth.signOut();
        setErrors({ form: refusal });
        return;
      }

      toast({ title: "Success", description: "Welcome back!" });
      playWelcomeSwoosh();
      navigate("/");
    } catch (error) {
      toast({
        title: "Could not sign in",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      toast({
        title: "Enter your email first",
        description: "We'll send the reset link to that address.",
        variant: "destructive",
      });
      return;
    }

    setIsResetLoading(true);
    try {
      const { error } = await novaHost.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      toast({
        title: "Reset link sent",
        description: `Check ${formData.email} for the link.`,
      });
    } catch (error) {
      toast({
        title: "Could not send reset link",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear the field's own error and any form-level refusal, which no longer
    // describes the credentials now in the box.
    setErrors((prev) => ({ ...prev, [field]: "", form: "" }));
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Welcome back to your mentor portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            {/*
              No focus:ring override here. The Input primitive already carries
              focus-visible:ring-ring; the old `focus:ring-accent` painted the
              ring in the neutral surface colour, so keyboard focus was
              invisible — and `focus:` rather than `focus-visible:` also fired
              it on plain mouse clicks.
            */}
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={cn(errors.email && "border-destructive")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetLoading}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                {isResetLoading ? "Sending…" : "Forgot password?"}
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={cn("pr-10", errors.password && "border-destructive")}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-10 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <p id="password-error" className="text-xs text-destructive">
                {errors.password}
              </p>
            )}
          </div>

          {errors.form && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            >
              {errors.form}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
