import { useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Clock, ShieldX, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * What a mentor sees between signing up and being approved.
 *
 * Every new account lands here. It is not a page you can navigate to -- the
 * ProtectedRoute in App.tsx renders it in place of whatever was asked for, so
 * the URL is preserved and the mentor lands on their intended page the moment
 * approval comes through.
 */
export default function PendingApproval() {
  const { user, approvalStatus, refreshApproval, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  const rejected = approvalStatus === "rejected";

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      await refreshApproval();
      // If it had flipped to approved, ProtectedRoute would already have
      // swapped this screen out -- so reaching this line means it has not.
      toast({
        title: "Still pending",
        description: "No decision yet. We'll email you as soon as there is one.",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center">
          <div
            className={
              rejected
                ? "mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10"
                : "mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10"
            }
          >
            {rejected ? (
              <ShieldX className="h-5 w-5 text-destructive" />
            ) : (
              <Clock className="h-5 w-5 text-primary" />
            )}
          </div>

          <h1 className="text-lg font-semibold">
            {rejected ? "Application not approved" : "Pending approval"}
          </h1>

          <p className="mt-1.5 text-sm text-muted-foreground">
            {rejected ? (
              <>
                Your mentor account was reviewed and not approved. If you think
                that is a mistake, reply to your signup email and we'll take
                another look.
              </>
            ) : (
              <>
                Thanks for signing up. Every mentor account is reviewed by hand
                before it goes live, so your portal is locked until we approve
                it. We'll email you the moment it's done.
              </>
            )}
          </p>
        </div>

        {user?.email && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-center">
            <p className="section-label">Signed in as</p>
            <p className="mt-0.5 break-all font-mono text-xs text-foreground">
              {user.email}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {!rejected && (
            <Button
              onClick={handleCheckAgain}
              disabled={checking}
              className="w-full"
            >
              {checking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check again
                </>
              )}
            </Button>
          )}

          <Button variant="outline" onClick={signOut} className="w-full">
            Sign out
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
