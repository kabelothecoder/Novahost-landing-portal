import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { novaHost } from "@/integrations/novahost/client";
import { ALL_ROBOTS } from "@/hooks/useTradeDispatch";

interface WakeRobotsCardProps {
  targetId: string;
  targetName: string;
}

interface WakeResult {
  queued: number;
  onPush: number;
}

/**
 * "Wake the robots": press before sending a trade.
 *
 * Every subscriber of the targeted robot gets an alert, worded as their robot
 * ("Please turn me on as I want to trade"), so robots that are switched off
 * get switched on before the trade arrives. Subscribers never see who sent it.
 *
 * The result line reports what `wake-robots` measured: how many were queued,
 * and how many of those have push turned on. The rest are emailed where an
 * address is on file. Same rule as the Fleet panel: no number here is assumed.
 */
export function WakeRobotsCard({ targetId, targetName }: WakeRobotsCardProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ at: Date; result: WakeResult } | null>(null);

  const wake = async () => {
    setBusy(true);
    try {
      const { data, error } = await novaHost.functions.invoke("wake-robots", {
        body: { ea_id: targetId === ALL_ROBOTS ? "MASTER_OVERRIDE" : targetId },
      });

      if (error) {
        // The function's own sentence (cooldown, pending approval) beats the
        // client library's "non-2xx status code".
        let message = "Could not send the wake-up.";
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) message = body.error;
        } catch {
          /* keep the generic */
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      const result = { queued: data?.queued ?? 0, onPush: data?.onPush ?? 0 };
      setLast({ at: new Date(), result });
      toast({
        title: result.queued ? "Wake-up sent" : "No one to wake",
        description: result.queued
          ? `${result.queued} subscriber${result.queued === 1 ? "" : "s"} of ${targetName} told to switch on.`
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
        <Button className="w-full gap-2 rounded-full" disabled={busy} onClick={wake}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          Send wake-up
        </Button>
        {last && (
          <p className="text-xs text-muted-foreground">
            {last.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {last.result.queued} told
            {" · "}
            {last.result.onPush} by iPhone push, the rest by email where we have one.
          </p>
        )}
        <p className="text-xs text-muted-foreground">One wake-up per robot every 5 minutes.</p>
      </CardContent>
    </Card>
  );
}
