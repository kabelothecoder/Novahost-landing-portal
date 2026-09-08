import { useEffect, useState } from "react";
import { KPICards } from "@/components/KPICards";
import { LicenseChart } from "@/components/LicenseChart";
import { RecentRequestsTable } from "@/components/RecentRequestsTable";
import { QuickAddCard } from "@/components/QuickAddCard";
import { useAuth } from "@/contexts/AuthContext";
import { novaHost } from "@/integrations/novahost/client";
import { cn } from "@/lib/utils";

type LicenseStatus = "loading" | "valid" | "invalid";

/*
 * What changed here, and why:
 *
 *   - The START button is gone. It was red, glowing, pulsing, and its only
 *     effect was a toast reading "Executing trades…". Nothing was dispatched.
 *     The licence check behind it is real, so that survives as a status line.
 *   - The date range picker is gone. Selecting a range set a loading flag,
 *     cleared it after a 1s timer, and filtered nothing.
 *   - "Command Center" is now "Dashboard", which is what it is.
 */
export function DashboardContent() {
  const { user } = useAuth();
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function checkLicense() {
      if (!user) return;
      try {
        const { data: licenses } = await novaHost
          .from("licenses")
          .select("license_key")
          .eq("user_id", user.id)
          .limit(1);

        const currentLicense = licenses?.[0]?.license_key;
        if (!currentLicense) {
          if (!cancelled) setLicenseStatus("invalid");
          return;
        }

        let deviceId = localStorage.getItem("device_id");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("device_id", deviceId);
        }

        const { data, error } = await novaHost.functions.invoke("validate-license", {
          body: { licenseKey: currentLicense, deviceId },
        });

        if (!cancelled) {
          setLicenseStatus(error || !data?.valid ? "invalid" : "valid");
        }
      } catch (err) {
        console.error("Validation error:", err);
        if (!cancelled) setLicenseStatus("invalid");
      }
    }

    checkLicense();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <LicenseStatusLine status={licenseStatus} />

      <KPICards />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LicenseChart />
        </div>
        <QuickAddCard />
      </div>

      <RecentRequestsTable />
    </div>
  );
}

function LicenseStatusLine({ status }: { status: LicenseStatus }) {
  const copy = {
    loading: "Checking licence…",
    valid: "Licence active",
    invalid: "No active licence on this device",
  }[status];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "valid" && "bg-long",
          status === "invalid" && "bg-short",
          status === "loading" && "bg-muted-foreground/40",
        )}
        aria-hidden="true"
      />
      <span>{copy}</span>
    </div>
  );
}
