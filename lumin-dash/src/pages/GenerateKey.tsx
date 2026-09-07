import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Key, Download, Copy, Eye, Bot, Coins, Plus, Loader2, Mail } from "lucide-react";
import { LicenseKeyCard } from "@/components/LicenseKeyCard";
import { novaHost } from "@/integrations/novahost/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  accent_color: string | null;
}

interface GeneratedKey {
  id: string;
  username: string;
  ea: string;
  eaName: string;
  plan: string;
  licenseKey: string;
  createdAt: string;
  status: "active" | "pending" | "expired";
  accentColor: string | null;
  artUrl: string | null;
  description: string | null;
}

const AVAILABLE_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "XAGUSD", 
  "NAS100", "US30", "SPX500", "BTCUSD", "ETHUSD", "VIX"
];


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GenerateKey() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<{ username: string; ea: string; plan: string; confirmed: boolean }>({ username: "", ea: "", plan: "", confirmed: false });
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [availablePlans, setAvailablePlans] = useState<{ id: string; code: string; name: string }[]>([]);
  const [recentKeys, setRecentKeys] = useState<GeneratedKey[]>([]);
  const [lastKey, setLastKey] = useState<GeneratedKey | null>(null);
  
  const [userId, setUserId] = useState<string | null>(null);
  
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTargetKey, setEmailTargetKey] = useState<GeneratedKey | null>(null);
  const [destinationEmail, setDestinationEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const { toast } = useToast();

  // Load User
  useEffect(() => {
    (async () => {
      const { data: { user } } = await novaHost.auth.getUser();
      if (!user) return;
      setUserId(user.id);
    })();
  }, []);

  // Shimmer
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Load products
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await novaHost
        .from("expert_advisors")
        .select("id, code, name, description, avatar_url, accent_color")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (error) { toast({ title: "Error", description: "Failed to load products", variant: "destructive" }); return; }
      setProductOptions(data ?? []);
    })();
  }, [userId, toast]);

  // Load plans when EA changes
  useEffect(() => {
    (async () => {
      if (!formData.ea) { setAvailablePlans([]); return; }
      const selected = productOptions.find(p => p.code === formData.ea || p.name === formData.ea);
      if (!selected) return;
      const { data, error } = await novaHost
        .from("plans")
        .select("id, code, name")
        .eq("product_id", selected.id)
        .order("name", { ascending: true });
      if (!error) setAvailablePlans(data ?? []);
    })();
  }, [formData.ea, productOptions]);

  // Credits system disabled for direct monthly subscription model

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productOptions.length === 0) {
      toast({ title: "Error", description: "You must create an EA first under 'Manage EAs' before generating a license key.", variant: "destructive" });
      return;
    }
    if (!formData.username || !formData.ea || !formData.plan || !formData.confirmed) {
      toast({ title: "Error", description: "Please fill in all fields and confirm the details.", variant: "destructive" });
      return;
    }
    
    // direct subscription license generation bypass

    // Derive robot metadata from selected EA
    const selectedProduct = productOptions.find(p => p.code === formData.ea);
    const eaDisplayName = selectedProduct?.name ?? formData.ea;

    const { data: rpcResponse, error } = await novaHost.functions.invoke("generate-license", {
      body: {
        ea: formData.ea,
        plan: formData.plan,
        username: formData.username,
        is_master: false, // Explicitly false for new keys
        metadata: {
          // The robot own accent, not a hash of its name. `robot_type` was also
          // written here — a strategy word chosen by hashing the display name,
          // stored on every licence and read by nothing.
          primary_color: selectedProduct?.accent_color ?? null,
          product_id: selectedProduct?.id,
          avatar: eaDisplayName,
          name: eaDisplayName,
        },
      },
    });

    if (error || !rpcResponse || rpcResponse.error) {
      const msg = rpcResponse?.error || error?.message || "Failed to generate key. Check credits.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return;
    }

    const newKey: GeneratedKey = {
      id: rpcResponse.license.id,
      username: formData.username,
      ea: formData.ea,
      eaName: eaDisplayName,
      plan: formData.plan,
      licenseKey: rpcResponse.license.license_key,
      createdAt: new Date(rpcResponse.license.issued_at).toLocaleString(),
      status: rpcResponse.license.status || 'active',
      accentColor: selectedProduct?.accent_color ?? null,
      artUrl: selectedProduct?.avatar_url ?? null,
      description: selectedProduct?.description ?? null,
    };

    setRecentKeys(prev => [newKey, ...prev]);
    setLastKey(newKey);
    
    // Subscription model does not track credit balance
    
    setFormData({ username: "", ea: "", plan: "", confirmed: false });
    toast({ title: "Key Generated!", description: `License ready for ${newKey.username} — ${eaDisplayName}` });
    try { (await import("@/lib/notify")).playNotificationSound(); } catch {}
  };

  const copyKey = useCallback((key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied!", description: "Key Generated! Copy to your Mobile App to activate." });
  }, [toast]);

  const triggerEmailModal = useCallback((key: GeneratedKey) => {
    setEmailTargetKey(key);
    setDestinationEmail("");
    setEmailModalOpen(true);
  }, []);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationEmail.trim() || !emailTargetKey) {
      toast({ title: "Validation Error", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data, error } = await novaHost.functions.invoke("send-license-email", {
        body: {
          licenseKey: emailTargetKey.licenseKey,
          email: destinationEmail.trim(),
          eaName: emailTargetKey.eaName,
          planName: emailTargetKey.plan,
        }
      });

      if (error) throw error;

      if (data.simulated) {
        toast({ 
          title: "Simulation Successful", 
          description: data.message,
          variant: "default" 
        });
      } else {
        toast({ 
          title: "Email Sent!", 
          description: `License key emailed successfully to ${destinationEmail.trim()}` 
        });
      }
      setEmailModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: "Send Failed", 
        description: err.message || "Failed to dispatch email", 
        variant: "destructive" 
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":  return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case "pending": return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      case "expired": return <Badge variant="destructive">Expired</Badge>;
      default:        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="animate-scale-in">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="animate-scale-in glass-card" style={{ animationDelay: "150ms" }}>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Generate License Key</h1>
          <p className="text-muted-foreground">Create new license keys for Expert Advisors</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 dark:bg-black/20 backdrop-blur-md rounded-xl p-2 px-4 border border-white/20 dark:border-white/10 shadow-sm glass-card text-xs font-mono uppercase tracking-widest text-primary font-bold">
          Active Subscription Model
        </div>
      </div>

      {/* Form Card */}
      <Card className="bg-gradient-card border-border glass-card">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>New License Key</CardTitle>
            <p className="text-sm text-muted-foreground">Fill in the details to generate a new license</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  className="bg-background/50 backdrop-blur-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ea">Expert Advisor</Label>
                <Select value={formData.ea} onValueChange={value => setFormData(prev => ({ ...prev, ea: value, plan: "" }))}>
                  <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select EA" />
                  </SelectTrigger>
                  <SelectContent className="glass-modal">
                    {productOptions.map(p => (
                      <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select value={formData.plan} onValueChange={value => setFormData(prev => ({ ...prev, plan: value }))}>
                <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder={formData.ea ? "Select plan" : "Select an EA first"} />
                </SelectTrigger>
                <SelectContent className="glass-modal">
                  {availablePlans.map(p => (
                    <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Symbols configuration has been moved directly to Manage EA profile settings */}

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="confirm"
                checked={formData.confirmed}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, confirmed: checked as boolean }))}
                disabled={productOptions.length === 0}
              />
              <Label htmlFor="confirm" className={`text-sm cursor-pointer ${productOptions.length === 0 ? "text-muted-foreground cursor-not-allowed" : "text-foreground/80"}`}>
                I verify the details above for activation.
              </Label>
            </div>

            {productOptions.length === 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
                <Bot className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">No Expert Advisors Found</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                    You cannot generate a license key because there are no Expert Advisors registered in the database. Please create an EA first under <span className="underline cursor-pointer font-bold" onClick={() => navigate("/manage")}>Manage EAs</span>.
                  </p>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={productOptions.length === 0}
              className="w-full md:w-auto shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:shadow-none transition-all"
            >
              Generate License Key
            </Button>
          </form>

          {/*
            The screenshot artefact. Actions sit below the card, never inside
            it, so a mentor's screenshot is the robot and the key and nothing
            else.
          */}
          {lastKey && (
            <div className="mt-8 max-w-lg space-y-3">
              <LicenseKeyCard
                robotName={lastKey.eaName}
                description={lastKey.description}
                artUrl={lastKey.artUrl}
                accentColor={lastKey.accentColor}
                licenseKey={lastKey.licenseKey}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => copyKey(lastKey.licenseKey)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy key
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => triggerEmailModal(lastKey)}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email key
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Paste this key into the NovaHost app to activate.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Keys Table */}
      {recentKeys.length > 0 && (
      <Card className="bg-gradient-card border-border glass-card">
        <CardHeader>
          <CardTitle>Recent Keys (Session)</CardTitle>
          <p className="text-sm text-muted-foreground">Keys generated in this session</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mobile View Layout (Stack cards vertically, no horizontal scrolling) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {recentKeys.map(key => (
                <div 
                  key={key.id} 
                  className="p-5 rounded-2xl border border-white/10 bg-black/40 flex flex-col justify-between space-y-4"
                  style={{ borderLeft: `4px solid ${key.accentColor ?? "hsl(var(--border))"}` }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-white font-bold text-base">{key.username}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{key.eaName} • {key.plan}</p>
                      </div>
                      {getStatusBadge(key.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 justify-between">
                      <code className="text-xs font-mono font-bold text-white/95 tracking-wider break-all">{key.licenseKey}</code>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-white/10" onClick={() => copyKey(key.licenseKey)}>
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-white/10" onClick={() => triggerEmailModal(key)}>
                          <Mail className="w-4 h-4 text-primary" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-muted-foreground font-mono">Created: {key.createdAt}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs text-primary hover:text-primary-glow font-bold gap-1 px-3 hover:bg-white/5 rounded-xl"
                      onClick={() => navigate(`/license-details/${key.licenseKey}`)}
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View Layout (md and larger) */}
            <div className="hidden md:block rounded-md border border-border/50 overflow-hidden bg-background/20 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-medium min-w-[120px]">Username</TableHead>
                      <TableHead className="font-medium min-w-[180px] hidden sm:table-cell">Expert Advisor</TableHead>
                      <TableHead className="font-medium min-w-[120px]">Plan</TableHead>
                      <TableHead className="font-medium min-w-[200px]">License Key</TableHead>
                      <TableHead className="font-medium min-w-[120px] hidden md:table-cell">Created</TableHead>
                      <TableHead className="font-medium min-w-[80px]">Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentKeys.map(key => (
                      <TableRow key={key.id} className="hover:bg-muted/50 transition-colors border-border/30">
                        <TableCell className="font-medium">
                          <div>
                            <div>{key.username}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{key.eaName}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: key.accentColor ?? "hsl(var(--muted-foreground))" }}
                            />
                            {key.eaName}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground/80">{key.plan}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-background/50 border border-border/30 px-2 py-1 rounded font-mono">{key.licenseKey}</code>
                            <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-muted" onClick={() => copyKey(key.licenseKey)}>
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-muted" onClick={() => triggerEmailModal(key)}>
                              <Mail className="w-3 h-3 text-primary" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{key.createdAt}</TableCell>
                        <TableCell>{getStatusBadge(key.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-muted"
                              onClick={() => navigate(`/license-details/${key.licenseKey}`)}>
                              <Eye className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Email Dispatch Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="glass-modal border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Email License Key
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Send the custom activation key directly to the user's inbox.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="destination-email" className="text-xs text-white/80">Destination Email Address</Label>
              <Input
                id="destination-email"
                type="email"
                required
                value={destinationEmail}
                onChange={e => setDestinationEmail(e.target.value)}
                placeholder="user@example.com"
                className="bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="bg-white/5 border-white/10 text-white rounded-xl"
                onClick={() => setEmailModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSendingEmail}
                className="bg-primary text-white rounded-xl shadow-lg shadow-primary/20"
              >
                {isSendingEmail ? (
                  <>Sending...</>
                ) : (
                  <>Send Email</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}