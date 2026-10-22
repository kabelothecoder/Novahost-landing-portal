import { useCallback, useEffect, useState } from "react";
import { BellRing, Loader2, Smartphone, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { novaHost } from "@/integrations/novahost/client";
import { ALL_ROBOTS } from "@/hooks/useTradeDispatch";

interface WakeRobotsCardProps {
  targetId: string;
  targetName: string;
}

/** What `wake-robots` measured, for a preview or for a send. */
interface Reach {
  queued: number;
  onPush: number;
  phones: number;
  /** Robots in the target still cooling down (preview only). */
  cooling: number;
}

/**
 * "Wake the robots": press before sending a trade.
 *
 * Every subscriber of the targeted robot gets an alert, worded as their robot
 * ("Please turn me on as I want to trade"), so robots that are switched off
 * get switched on before the trade arrives. Subscribers never see who sent it.
 *
 * Before the press, the card asks `wake-robots` for a preview: how many
 * subscribers would be told and how many phones would buzz. After a press it
 * counts down the five-minute cooldown, which the server owns: the end time
 * comes from the function, so a reload or a second tab shows the same clock.
 * Same rule as the Fleet panel: no number here is assumed.
 */
export function WakeRobotsCard({ targetId, targetName }: WakeRobotsCardProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [reach, setReach] = useState<Reach | null>(null);
  const [checking, setChecking] = useState(true);
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const eaId = targetId === ALL_ROBOTS ? "MASTER_OVERRIDE" : targetId;

  /** The function's own sentence (cooldown, pending approval) beats "non-2xx status code". */
  const readError = async (error: unknown) => {
    try {
      return await (error as { context?: Response }).context?.json();
    } catch {
      return null;
    }
  };

  const preview = useCallback(async () => {
    setChecking(true);
    try {
      const { data, error } = await novaHost.functions.invoke("wake-robots", {
        body: { ea_id: eaId, preview: true },
      });
      if (error || !data?.success) throw new Error();
      setReach({
        queued: data.queued ?? 0,
        onPush: data.onPush ?? 0,
        phones: data.phones ?? 0,
        cooling: data.cooling ?? 0,
      });
      setUntil(data.cooldownUntil ? new Date(data.cooldownUntil).getTime() : null);
    } catch {
      // The button still works without a preview; the line below just says less.
      setReach(null);
    } finally {
      setChecking(false);
    }
  }, [eaId]);

  useEffect(() => {
    preview();
  }, [preview]);

  // Tick only while a cooldown is running, then refresh what a press would do.
  const coolingNow = until !== null && until > now;
  useEffect(() => {
    if (until === null) return;
    if (until <= Date.now()) {
      setUntil(null);
      preview();
      return;
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until, now, preview]);

  const wake = async () => {
    setBusy(true);
    try {
      const { data, error } = await novaHost.functions.invoke("wake-robots", { body: { ea_id: eaId } });

      if (error) {
        const body = await readError(error);
        if (body?.cooldownUntil) setUntil(new Date(body.cooldownUntil).getTime());
        throw new Error(body?.error || "Could not send the wake-up.");
      }
      if (data?.error) throw new Error(data.error);

      const queued = data?.queued ?? 0;
      const phones = data?.phones ?? 0;
      if (data?.cooldownUntil) {
        setUntil(new Date(data.cooldownUntil).getTime());
        setNow(Date.now());
      }
      toast({
        title: queued ? "Wake-up sent" : "No one to wake",
        description: queued
          ? `${queued} subscriber${queued === 1 ? "" : "s"} of ${targetName} told to switch on · ${phones} phone${phones === 1 ? "" : "s"} buzzed.`
          : `${targetName} has no active subscribers yet.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Wake-up not sent",
        description: e instanceof Error ? e.message : "Could not send the wake-up.",
      });
    } finally {
      setBusy(false);
    }
  };

  const left = coolingNow ? Math.ceil((until! - now) / 1000) : 0;
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const nobody = reach !== null && reach.queued === 0 && !coolingNow;
  const byEmail = reach ? Math.max(0, reach.queued - reach.onPush) : 0;

  return (
    <Card>
      <CardHeader className="border-b border-border px-5 py-3.5">
        <CardTitle>Wake the robots</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        <p className="text-sm text-muted-foreground">
          Before you send, tell every subscriber of {targetName} to switch their robot on.
        </p>
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
          <span className="font-medium">Robot name:</span>{" "}
          <span className="text-muted-foreground">Please turn me on as I want to trade</span>
        </div>

        <div className="flex items-start gap-2 text-sm" aria-live="polite">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          {checking && !reach ? (
            <span className="text-muted-foreground">Checking who will get it…</span>
          ) : coolingNow ? (
            <span className="text-muted-foreground">Sent. Subscribers have been told.</span>
          ) : reach ? (
            reach.queued ? (
              <span>
                <span className="font-medium">
                  {reach.phones} phone{reach.phones === 1 ? "" : "s"} will buzz
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · {reach.queued} subscriber{reach.queued === 1 ? "" : "s"}
                  {byEmail ? `, ${byEmail} by email where we have one` : ""}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">{targetName} has no active subscribers yet.</span>
            )
          ) : (
            <span className="text-muted-foreground">Could not check who will get it.</span>
          )}
        </div>
        {reach && reach.cooling > 0 && !coolingNow && (
          <p className="text-xs text-muted-foreground">
            {reach.cooling} robot{reach.cooling === 1 ? " was" : "s were"} woken in the last 5 minutes and will be
            skipped.
          </p>
        )}

        <Button className="w-full gap-2 rounded-full" disabled={busy || coolingNow || nobody} onClick={wake}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : coolingNow ? (
            <Timer className="h-4 w-4" />
          ) : (
            <BellRing className="h-4 w-4" />
          )}
          {busy ? "Sending…" : coolingNow ? `Wake again in ${clock}` : "Send wake-up"}
        </Button>
        <p className="text-xs text-muted-foreground">One wake-up per robot every 5 minutes.</p>
      </CardContent>
    </Card>
  );
}
