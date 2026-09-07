import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, CheckCircle, XCircle, Search } from "lucide-react";
import { novaHost } from "@/integrations/novahost/client";

export default function ReActivateKey() {
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    searchTerm: ""
  });
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    message: string;
    keyInfo?: {
      licenseKey: string;
      username: string;
      ea: string;
      plan: string;
      status: string;
      expiryDate: string;
    };
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a license key or username to search.",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      const { data, error } = await novaHost.functions.invoke('admin-licenses', {
        body: { action: 'search', query: formData.searchTerm.trim() },
      });
      if (error) throw error;

      const item = data?.results?.[0];
      if (item) {
        const isActive = item.status === 'active';
        setSearchResult({
          found: true,
          message: isActive ? 'License is already active. No action needed.' : 'License found and ready for reactivation.',
          keyInfo: {
            licenseKey: item.license_key,
            username: (item.metadata?.username ?? ''),
            ea: item.product?.name ?? '',
            plan: item.plan?.name ?? '',
            status: item.status,
            expiryDate: item.expires_at ? new Date(item.expires_at).toLocaleString() : 'Never',
          },
        });
      } else {
        setSearchResult({
          found: false,
          message: "No license found with the provided license key or username. Please check and try again.",
        });
      }
    } catch (err: any) {
      toast({ title: 'Search failed', description: err.message || String(err), variant: 'destructive' });
      setSearchResult({ found: false, message: 'Search failed. Please try again.' });
    }

    setIsSearching(false);
  };

  const handleReactivate = async () => {
    if (!searchResult?.keyInfo) return;

    setIsSearching(true);

    try {
      const { data, error } = await novaHost.functions.invoke('admin-licenses', {
        body: { action: 'reactivate', licenseKey: searchResult.keyInfo.licenseKey },
      });
      if (error) throw error;
      setSearchResult(prev => prev ? {
        ...prev,
        keyInfo: prev.keyInfo ? { ...prev.keyInfo, status: 'active', expiryDate: data?.license?.expires_at ? new Date(data.license.expires_at).toLocaleString() : 'Never' } : undefined,
        message: 'License successfully reactivated! The license is now active.'
      } : null);
    } catch (err: any) {
      toast({ title: 'Reactivation failed', description: err.message || String(err), variant: 'destructive' });
    }

    setIsSearching(false);

    toast({
      title: "Success",
      description: `License for ${searchResult.keyInfo.username} has been reactivated successfully.`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-success";
      case "expired":
        return "text-destructive";
      case "suspended":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="animate-scale-in">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="animate-scale-in" style={{ animationDelay: "150ms" }}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Re-Activate License Key</h1>
        <p className="text-muted-foreground">
          Search and reactivate expired or suspended license keys
        </p>
      </div>

      {/* Search Form */}
      <Card className="bg-gradient-card border-border">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Search License</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter a license key or username to search for reactivation
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="search-term">License Key or Username</Label>
              <Input
                id="search-term"
                value={formData.searchTerm}
                onChange={(e) => setFormData(prev => ({ ...prev, searchTerm: e.target.value }))}
                placeholder="Enter license key (e.g., PRO-2024-ABCD1234) or username"
                disabled={isSearching}
              />
              <p className="text-xs text-muted-foreground">
                You can search by either the full license key or the username associated with the license.
              </p>
            </div>

            <Button type="submit" disabled={isSearching} className="w-full md:w-auto">
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search License
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResult && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {searchResult.found ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              Search Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className={searchResult.found ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"}>
              <AlertDescription>{searchResult.message}</AlertDescription>
            </Alert>

            {searchResult.found && searchResult.keyInfo && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">License Key</p>
                    <p className="font-mono text-sm">{searchResult.keyInfo.licenseKey}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Username</p>
                    <p className="text-sm">{searchResult.keyInfo.username}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expert Advisor</p>
                    <p className="text-sm">{searchResult.keyInfo.ea}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Plan</p>
                    <p className="text-sm">{searchResult.keyInfo.plan}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className={`text-sm font-medium capitalize ${getStatusColor(searchResult.keyInfo.status)}`}>
                      {searchResult.keyInfo.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                    <p className="text-sm">{searchResult.keyInfo.expiryDate}</p>
                  </div>
                </div>

                {searchResult.keyInfo.status !== "active" && (
                  <Button 
                    onClick={handleReactivate} 
                    disabled={isSearching}
                    className="w-full md:w-auto"
                  >
                    {isSearching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Reactivating...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reactivate License
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-muted/10 border-muted">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Need Help?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• License keys are case-insensitive when searching</li>
            <li>• You can search by partial username or full license key</li>
            <li>• Only expired or suspended licenses can be reactivated</li>
            <li>• Contact support if you can't find the license you're looking for</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}