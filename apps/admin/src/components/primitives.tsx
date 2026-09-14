import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The four states every page on this console has to render, in one place, so
 * they look the same everywhere: loading, failed, empty, and the real thing.
 */

/** One headline number. */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "good" | "warn" | "bad";
  loading?: boolean;
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-24" />
        ) : (
          <p className={cn("mt-2 text-[26px] font-bold leading-none tracking-tight tabular-nums", toneClass)}>
            {value}
          </p>
        )}
        {hint && !loading && <p className="mt-2 text-[12px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Section wrapper with a title and optional right-hand slot. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-[15px]">{title}</CardTitle>
          {description && (
            <p className="mt-1 text-[12.5px] font-normal text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** A failed load. Says what broke and offers the one useful action. */
export function LoadError({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{error}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Nothing to show.
 *
 * Always says *why* it is empty, because on an admin console "no rows" and "you
 * cannot see these rows" look identical and mean completely different things.
 */
export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" />
      <p className="mt-3 text-[14px] font-medium">{title}</p>
      {body && <p className="mt-1 max-w-[46ch] text-[13px] text-muted-foreground">{body}</p>}
    </div>
  );
}

/** Table-shaped skeleton so the layout does not jump when rows arrive. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn("h-9 flex-1", c === 0 && "max-w-[220px]")} />
          ))}
        </div>
      ))}
    </div>
  );
}
