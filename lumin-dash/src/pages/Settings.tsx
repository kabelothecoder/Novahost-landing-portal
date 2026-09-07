import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { novaHost } from "@/integrations/novahost/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type NotificationPrefs = {
  emailNotifications: boolean;
  smsAlerts: boolean;
};

const DEFAULTS: NotificationPrefs = { emailNotifications: true, smsAlerts: false };

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Preferences. Profile name, email and avatar live on the Profile page.
 *
 * This page used to fake its own save: `handleSave` awaited a 1000ms timer
 * under a `// Simulate API call` comment and then toasted "Your preferences
 * have been successfully updated". Nothing was written anywhere and a reload
 * put both toggles back to their defaults.
 *
 * Preferences now persist to the NovaHost user's `user_metadata`. That is a
 * legitimate store for per-user settings and needs no migration — worth knowing
 * that it is client-writable, so it must never hold anything that grants
 * access. These are display preferences, so it is the right place.
 */
export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [saved, setSaved] = useState<NotificationPrefs>(DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);

  // Seed from what is actually stored, falling back to the defaults for an
  // account that has never saved.
  useEffect(() => {
    const meta = user?.user_metadata ?? {};
    const initial: NotificationPrefs = {
      emailNotifications:
        typeof meta.emailNotifications === "boolean"
          ? meta.emailNotifications
          : DEFAULTS.emailNotifications,
      smsAlerts: typeof meta.smsAlerts === "boolean" ? meta.smsAlerts : DEFAULTS.smsAlerts,
    };
    setPrefs(initial);
    setSaved(initial);
  }, [user]);

  const dirty =
    prefs.emailNotifications !== saved.emailNotifications || prefs.smsAlerts !== saved.smsAlerts;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await novaHost.auth.updateUser({ data: prefs });
      if (error) throw error;

      setSaved(prefs);
      toast({ title: "Preferences saved" });
    } catch (e) {
      // A failed write must not look like a successful one, which is precisely
      // what the previous implementation did by construction.
      toast({
        title: "Couldn't save preferences",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  aria-pressed={theme === t.value}
                  className={cn(
                    "h-9 rounded-md border text-sm font-medium transition-colors",
                    theme === t.value
                      ? "border-primary bg-primary-muted text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Applies immediately and is remembered on this device.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          <Row
            label="Email notifications"
            hint="Licence activations and expiries"
            checked={prefs.emailNotifications}
            onChange={(v) => setPrefs((p) => ({ ...p, emailNotifications: v }))}
          />
          <Row
            label="SMS alerts"
            hint="Urgent notifications by text message"
            checked={prefs.smsAlerts}
            onChange={(v) => setPrefs((p) => ({ ...p, smsAlerts: v }))}
          />
        </CardContent>
      </Card>

      {/*
        Said plainly rather than left to be discovered. The preference is stored
        for real; the delivery side does not exist yet, and a toggle that saves
        correctly but sends nothing is still worth labelling.
      */}
      <p className="text-xs text-muted-foreground">
        Your choice is saved to your account, but the portal does not send email or SMS yet —
        these take effect once delivery is built.
      </p>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={!dirty || isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save preferences"}
        </Button>
        {dirty && !isSaving && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <Label className="text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
