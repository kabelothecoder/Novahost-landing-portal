import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

/** The push service wants the public key as bytes, not base64url. */
function keyBytes(b64url: string): Uint8Array {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State =
  | { kind: "checking" }
  | { kind: "unsupported"; why: string }
  | { kind: "blocked" }
  | { kind: "off" }
  | { kind: "on" };

/**
 * Switches this phone's alerts on and off.
 *
 * Web Push on an iPhone only exists for a site that has been added to the Home
 * Screen and opened from there. In an ordinary Safari tab `PushManager` is
 * simply absent, so that is the first thing this says rather than offering a
 * button that cannot work.
 *
 * `requestPermission` runs first and straight from the tap: iOS only honours it
 * inside a user gesture, and an `await` ahead of it (fetching the key, say)
 * would spend the gesture.
 */
export function PhoneAlerts() {
  const { toast } = useToast();
  const [state, setState] = useState<State>({ kind: "checking" });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      setState({
        kind: "unsupported",
        why: ios
          ? "On an iPhone, add this console to your Home Screen (Share, then Add to Home Screen) and open it from there to turn on alerts."
          : "This browser cannot receive push alerts.",
      });
      return;
    }
    if (Notification.permission === "denied") {
      setState({ kind: "blocked" });
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState({ kind: sub && Notification.permission === "granted" ? "on" : "off" });
    } catch {
      setState({ kind: "off" });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const turnOn = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        await refresh();
        toast({
          title: "Alerts not allowed",
          description: "Allow notifications for this app in your phone's Settings, then try again.",
          variant: "destructive",
        });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.pushConfig();
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(publicKey) as BufferSource,
        }));
      await api.pushSubscribe(sub.toJSON());
      await api.pushTest(sub.toJSON());
      setState({ kind: "on" });
      toast({ title: "Alerts are on", description: "A test notification is on its way to this phone." });
    } catch (err) {
      toast({
        title: "Could not turn alerts on",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.pushUnsubscribe(sub.toJSON());
        await sub.unsubscribe();
      }
      setState({ kind: "off" });
      toast({ title: "Alerts are off for this phone" });
    } catch (err) {
      toast({
        title: "Could not turn alerts off",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (state.kind === "checking") return null;

  if (state.kind === "unsupported") {
    return <p className="max-w-[60ch] text-[12.5px] text-muted-foreground">{state.why}</p>;
  }

  if (state.kind === "blocked") {
    return (
      <p className="max-w-[60ch] text-[12.5px] text-muted-foreground">
        Notifications are blocked for this app. Allow them in your phone's Settings, then reopen it.
      </p>
    );
  }

  return state.kind === "on" ? (
    <Button variant="outline" size="sm" onClick={() => void turnOff()} disabled={busy} className="gap-1.5">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
      Alerts on · turn off
    </Button>
  ) : (
    <Button size="sm" onClick={() => void turnOn()} disabled={busy} className="gap-1.5">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
      Turn on phone alerts
    </Button>
  );
}
