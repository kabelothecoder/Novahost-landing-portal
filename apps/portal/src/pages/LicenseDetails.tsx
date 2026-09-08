import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { novaHost } from "@/integrations/novahost/client";
import { 
  ArrowLeft, 
  Key, 
  Calendar, 
  Clock, 
  Shield, 
  Activity,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface LicenseDetails {
  id: string;
  licenseKey: string;
  username: string;
  ea: string;
  plan: string;
  status: "active" | "not-used" | "expired" | "deactivated";
  createdAt: string;
  expiryDate: string;
  description: string;
}

function TradeLogsDisplay({ licenseKey }: { licenseKey: string }) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!licenseKey) return;
    
    // Initial fetch
    const fetchLogs = async () => {
      const { data } = await novaHost
        .from('trade_logs')
        .select('*')
        .eq('license_key', licenseKey)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setLogs(data);
    };
    fetchLogs();

    // Subscribe
    const channel = novaHost
      .channel(`trade_logs_${licenseKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trade_logs', filter: `license_key=eq.${licenseKey}` },
        (payload) => {
          setLogs(prev => [payload.new, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      novaHost.removeChannel(channel);
    };
  }, [licenseKey]);

  if (logs.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 text-center">No trades recorded yet.</div>;
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-black/20">
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              <Badge variant="outline" className={log.action.toLowerCase() === 'buy' ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'}>
                {log.action.toUpperCase()}
              </Badge>
              {log.pair}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(log.created_at).toLocaleString()}
            </div>
          </div>
          <div className={`font-mono font-bold ${log.pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {log.pl >= 0 ? '+' : ''}{log.pl.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}


export default function LicenseDetails() {
  const { licenseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [license, setLicense] = useState<LicenseDetails | null>(null);
  const [notUsed, setNotUsed] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      if (!licenseId) {
        setLicense(null);
        setIsLoading(false);
        return;
      }
      const { data: lic, error } = await novaHost
        .from('licenses')
        .select('id, license_key, metadata, status, issued_at, expires_at, product_id, plan_id')
        .eq('license_key', licenseId)
        .maybeSingle();
      if (error || !lic) {
        setLicense(null);
        setIsLoading(false);
        return;
      }
      const [productRes, planRes, countRes] = await Promise.all([
        novaHost.from('expert_advisors').select('name, description').eq('id', lic.product_id).maybeSingle(),
        novaHost.from('plans').select('name').eq('id', lic.plan_id).maybeSingle(),
        novaHost.from('device_activations').select('*', { head: true, count: 'exact' }).eq('license_id', lic.id),
      ]);
      const product = productRes.data;
      const plan = planRes.data;
      setNotUsed((countRes.count ?? 0) === 0);
      setLicense({
        id: lic.id,
        licenseKey: lic.license_key,
        username: (lic as any).metadata?.username ?? '',
        ea: product?.name ?? 'Product',
        plan: plan?.name ?? '',
        status: lic.status as any,
        createdAt: new Date(lic.issued_at).toLocaleString(),
        expiryDate: lic.expires_at ? new Date(lic.expires_at).toLocaleString() : 'Never',
        description: product?.description ?? '',
      });
      setIsLoading(false);
    })();
  }, [licenseId]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          icon: CheckCircle2,
          className: "bg-success/10 text-success border-success/20",
          label: "Active"
        };
      case "not-used":
        return {
          icon: Clock,
          className: "bg-warning/10 text-warning border-warning/20",
          label: "Not Yet Used"
        };
      case "expired":
        return {
          icon: XCircle,
          className: "bg-destructive/10 text-destructive border-destructive/20",
          label: "Expired"
        };
      case "deactivated":
        return {
          icon: AlertTriangle,
          className: "bg-muted text-muted-foreground border-muted",
          label: "Deactivated"
        };
      case "FAILED_CREDENTIALS":
        return {
          icon: AlertTriangle,
          className: "bg-red-500/10 text-red-400 border-red-500/20",
          label: "Credentials Failed"
        };
      default:
        return {
          icon: Activity,
          className: "bg-secondary text-secondary-foreground border-secondary",
          label: status
        };
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "License key copied to clipboard",
    });
  };

  const handleDeactivate = async () => {
    if (!license) return;
    const { error } = await novaHost.from('licenses').update({ status: 'suspended' }).eq('id', license.id);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    setLicense(prev => prev ? { ...prev, status: "deactivated" } : null);
    toast({
      title: "License Deactivated",
      description: "The license has been deactivated successfully.",
      variant: "destructive"
    });
  };

  const handleDownload = () => {
    toast({
      title: "Download Started",
      description: "License details are being downloaded.",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
          <div>
            <div className="h-6 bg-muted rounded w-32 animate-pulse mb-2" />
            <div className="h-4 bg-muted rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="animate-pulse">
                <div className="h-8 bg-muted rounded w-48 mb-2" />
                <div className="h-4 bg-muted rounded w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-20 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader className="animate-pulse">
                <div className="h-6 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-destructive/20 rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!license) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">License Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested license could not be found.</p>
        <Button onClick={() => navigate("/generate-key")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Generate Key
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(license.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="hover-scale"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">License Details</h1>
            <p className="text-muted-foreground">
              Complete information about this license key
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-card border-border hover-scale">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  License Information
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className={statusConfig.className}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                  <Badge className="bg-success/10 text-success border-success/20">
                    <Activity className="w-3 h-3 mr-1" />
                    Not Yet Used
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* License Key Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">License Key</label>
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                  <code className="text-2xl font-mono font-bold text-primary flex-1 tracking-wider">
                    {license.licenseKey}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(license.licenseKey)}
                    className="hover-scale"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Product Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">
                  {license.ea}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {license.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card className="bg-gradient-card border-border hover-scale mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-primary" />
                Live Trade Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TradeLogsDisplay licenseKey={license.licenseKey} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card className="bg-gradient-card border-border hover-scale">
            <CardHeader>
              <CardTitle className="text-lg">Quick Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">User</span>
                <span className="font-medium">{license.username}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <Badge variant="secondary">{license.plan}</Badge>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{license.createdAt}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="font-medium">{license.expiryDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full hover-scale"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Details
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full hover-scale"
                onClick={() => copyToClipboard(license.licenseKey)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy License Key
              </Button>

              {license.status !== "deactivated" && (
                <Button 
                  variant="destructive" 
                  className="w-full hover-scale"
                  onClick={handleDeactivate}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}