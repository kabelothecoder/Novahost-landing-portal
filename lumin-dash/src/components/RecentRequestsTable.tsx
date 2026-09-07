import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText, Eye, RefreshCw, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { novaHost } from "@/integrations/novahost/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface DBRow {
  id: string;
  license_key: string;
  status: string;
  issued_at: string;
  expires_at: string;
  metadata: any;
  products: { name: string } | null;
  plans: { name: string } | null;
}

function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
    case "pending":
      return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
    case "expired":
      return <Badge variant="destructive">Expired</Badge>;
    case "revoked":
      return <Badge variant="destructive">Revoked</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}

export function RecentRequestsTable() {
  const [licenses, setLicenses] = useState<DBRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReactivating, setIsReactivating] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchLicenses = async () => {
    try {
      const { data: sessionData } = await novaHost.auth.getSession();
      if (!sessionData.session) {
        setLicenses([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await novaHost
        .from('licenses')
        .select(`
          id,
          license_key,
          status,
          issued_at,
          expires_at,
          metadata,
          products:expert_advisors!licenses_product_id_fkey (name),
          plans (name)
        `)
        .eq('user_id', sessionData.session.user.id)
        .order('issued_at', { ascending: false })
        .limit(20);

      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('unauthorized')) {
          setLicenses([]);
          return;
        }
        throw error;
      }
      setLicenses(data as unknown as DBRow[] ?? []);
    } catch (e: any) {
      console.warn("Gracefully handled license fetch error:", e);
      setLicenses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  },[]);

  const handleReactivate = async (licenseId: string) => {
    setIsReactivating(licenseId);
    try {
      const { data, error } = await novaHost.functions.invoke("reactivate-license", {
        body: { license_id: licenseId }
      });
      if (error) throw error;
      
      toast({ title: "Success", description: "License reactivated! 1 credit deducted." });
      await fetchLicenses();
    } catch (e: any) {
      console.error(e);
      const msg = e?.context?.body?.error || e?.message || "Failed to reactivate license.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsReactivating(null);
    }
  };

  return (
    <Card className="bg-gradient-card border-border hover:shadow-hover transition-all duration-300 glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Recent Licenses</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest license key generation requests and status
          </p>
        </div>
        <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center shrink-0 border border-primary/20 backdrop-blur-md">
          <FileText className="w-4 h-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="space-y-4">
            {/* Mobile View Layout (Stack cards vertically, no horizontal scrolling) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {licenses.map((request) => {
                const username = (request.metadata as any)?.username || "Unknown";
                const productName = Array.isArray(request.products) ? request.products[0]?.name : request.products?.name ?? 'Unknown';
                const planName = Array.isArray(request.plans) ? request.plans[0]?.name : request.plans?.name ?? 'Unknown';
                return (
                  <div 
                    key={request.id} 
                    className="p-5 rounded-2xl border border-white/10 bg-black/40 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-white font-bold text-base">{username}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{productName} • {planName}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 justify-between">
                        <code className="text-xs font-mono font-bold text-white/95 tracking-wider break-all">{request.license_key}</code>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-1 text-xs">
                      <span className="text-muted-foreground font-mono">Issued: {new Date(request.issued_at).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs text-primary hover:text-primary-glow font-bold gap-1 px-3 hover:bg-white/5 rounded-xl"
                          onClick={() => navigate(`/license-details/${request.license_key}`)}
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                        {request.status.toLowerCase() === 'expired' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs text-amber-500 font-bold gap-1 px-3 hover:bg-white/5 rounded-xl"
                            onClick={(e) => {
                              e.preventDefault();
                              handleReactivate(request.id);
                            }}
                            disabled={isReactivating === request.id}
                          >
                            {isReactivating === request.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {licenses.length === 0 && (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                  <p className="text-muted-foreground text-sm">No recent licenses found</p>
                </div>
              )}
            </div>

            {/* Desktop Table View Layout (md and larger) */}
            <div className="hidden md:block rounded-md border border-white/10 dark:border-white/5 overflow-hidden bg-white/5 dark:bg-black/20 backdrop-blur-md">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-white/10">
                      <TableHead className="font-medium min-w-[200px]">License Key</TableHead>
                      <TableHead className="font-medium min-w-[120px]">Requester</TableHead>
                      <TableHead className="font-medium min-w-[120px] hidden sm:table-cell">Product</TableHead>
                      <TableHead className="font-medium min-w-[100px] hidden sm:table-cell">Plan</TableHead>
                      <TableHead className="font-medium min-w-[100px]">Status</TableHead>
                      <TableHead className="font-medium min-w-[100px] hidden md:table-cell">Issued Date</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((request) => (
                      <TableRow key={request.id} className="hover:bg-white/10 dark:hover:bg-white/5 transition-colors border-white/10">
                        <TableCell className="font-mono text-xs">{request.license_key}</TableCell>
                        <TableCell className="font-medium">
                          {(request.metadata as any)?.username || "Unknown"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                           {Array.isArray(request.products) ? request.products[0]?.name : request.products?.name ?? 'Unknown'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                           {Array.isArray(request.plans) ? request.plans[0]?.name : request.plans?.name ?? 'Unknown'}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                          {new Date(request.issued_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-8 h-8 glass-btn hover:glass-btn">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-modal">
                              <DropdownMenuItem onClick={() => navigate(`/license-details/${request.license_key}`)} className="cursor-pointer">
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {request.status.toLowerCase() === 'expired' && (
                                <DropdownMenuItem className="cursor-pointer text-amber-500 font-semibold" onClick={(e) => {
                                  e.preventDefault();
                                  handleReactivate(request.id);
                                }}>
                                  {isReactivating === request.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                  Reactivate (1 Credit)
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {licenses.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                           No recent licenses found
                         </TableCell>
                       </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}