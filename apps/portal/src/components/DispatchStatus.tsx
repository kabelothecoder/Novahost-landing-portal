import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DispatchStatusProps {
  activeTerminals: number;
  clientsReached: number;
  lastSignalSent: Date | null;
  hasSent: boolean;
}

/**
 * Fleet state for the dispatch screens.
 *
 * Every number here is measured. The panel this replaces rendered a glowing
 * progress bar filled from the heartbeat count at send time, so it read
 * "Synchronized" whether or not a single handset had executed anything.
 */
export function DispatchStatus({
  activeTerminals,
  clientsReached,
  lastSignalSent,
  hasSent,
}: DispatchStatusProps) {
  const pct =
    activeTerminals > 0 ? Math.min(100, (clientsReached / activeTerminals) * 100) : 0;
  const outstanding = Math.max(0, activeTerminals - clientsReached);

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between space-y-0 border-b border-border px-5 py-3.5">
        <CardTitle>Fleet</CardTitle>
        <span className="text-xs text-muted-foreground">Refreshed every 10s</span>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="flex items-baseline justify-between">
          <span className="section-label">Terminals online</span>
          <span className="tabular text-2xl font-semibold">{activeTerminals}</span>
        </div>

        {activeTerminals === 0 && (
          <p className="text-xs text-muted-foreground">
            No terminal running your robots has checked in for 15 minutes. A signal sent now
            is recorded, but nothing will trade until one comes online.
          </p>
        )}

        {hasSent && (
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-baseline justify-between">
              <span className="section-label">Picked up</span>
              <span className="tabular text-sm font-medium">
                {clientsReached}
                {activeTerminals > 0 && (
                  <span className="text-muted-foreground"> / {activeTerminals}</span>
                )}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>

            <p
              className={cn(
                "text-xs",
                clientsReached > 0 && outstanding === 0 ? "text-long" : "text-muted-foreground",
              )}
            >
              {clientsReached === 0
                ? "Waiting for a terminal to pick it up…"
                : outstanding > 0
                  ? `${outstanding} terminal${outstanding === 1 ? "" : "s"} not picked up yet`
                  : "Picked up by every online terminal"}
            </p>

            {lastSignalSent && (
              <p className="text-xs text-muted-foreground">
                Last sent {lastSignalSent.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
