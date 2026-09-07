import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Edit, Trash2, Plus, AlertTriangle, Bot, CheckCircle2, Loader2, Settings
} from "lucide-react";
import { novaHost } from "@/integrations/novahost/client";
import { playNotificationSound } from "@/lib/notify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EA {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  isActive: boolean;
  totalUsers: number;
  activeUsers: number;
  createdAt: string;
  master_key?: string;
  code: string;
}

/**
 * @description ManageEAs displays the list of Expert Advisors, supports mobile-optimized view cards, 
 * handles registration of new EAs via Edge function, and handles deletion via NovaHost RLS.
 */
export default function ManageEAs() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eas, setEAs] = useState<EA[]>([]);
  const [formData, setFormData] = useState({ name: "", confirmed: false });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eaToDelete, setEAToDelete] = useState<EA | null>(null);

  const loadEAs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await novaHost.auth.getSession();
      if (!sessionData?.session) {
        setIsLoading(false);
        return;
      }
      const userId = sessionData.session.user.id;

      const { data: productsData, error: prodError } = await novaHost
        .from("expert_advisors")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      
      if (prodError) throw prodError;

      const { data: licensesData, error: licError } = await novaHost
        .from("licenses")
        .select("product_id, status")
        .eq("user_id", userId);
      
      if (licError) throw licError;

      const loadedEAs: EA[] = (productsData || []).map(p => {
        const productLicenses = (licensesData || []).filter(l => l.product_id === p.id);
        const totalUsers = productLicenses.length;
        const activeUsers = productLicenses.filter(l => l.status === "active").length;

        return {
          id: p.id,
          name: p.name,
          description: p.description || "",
          image: p.avatar_url || "",
          color: p.accent_color || "#3b82f6",
          isActive: true,
          totalUsers,
          activeUsers,
          createdAt: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          code: p.code || ""
        };
      });

      setEAs(loadedEAs);
    } catch (err: any) {
      console.error("Failed to load EAs:", err);
      toast({
        title: "Load Failed",
        description: err.message || "Could not retrieve Expert Advisors.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadEAs();
  }, [loadEAs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.confirmed) {
      toast({
        title: "Validation Error",
        description: "Please enter EA name and confirm the action.",
        variant: "destructive"
      });
      playNotificationSound();
      return;
    }

    setIsSubmitting(true);
    try {
      // Create product (EA) via secure Edge Function
      const { data, error } = await novaHost.functions.invoke('manage-eas', {
        body: { action: 'create', name: formData.name.trim() }
      });

      if (error) throw error;

      const product = data.product as { id: string; code: string; name: string };
      const newEA: EA = {
        id: product.id,
        name: product.name,
        description: "",
        image: "",
        color: "#3b82f6",
        isActive: true,
        totalUsers: 0,
        activeUsers: 0,
        createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        code: product.code
      };

      setEAs(prev => [newEA, ...prev]);
      toast({ title: "Success", description: `EA "${product.name}" registered successfully.` });
      playNotificationSound();

      setFormData({ name: "", confirmed: false });
    } catch (err: any) {
      console.error('Add EA failed:', err);
      toast({ 
        title: "Creation Failed", 
        description: err.message || "Failed to create Expert Advisor", 
        variant: "destructive" 
      });
      playNotificationSound();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (ea: EA) => {
    setEAToDelete(ea);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!eaToDelete) return;
    try {
      const { error } = await novaHost
        .from("expert_advisors")
        .delete()
        .eq("id", eaToDelete.id);

      if (error) throw error;

      setEAs(prev => prev.filter(ea => ea.id !== eaToDelete.id));
      toast({
        title: "Success",
        description: `EA "${eaToDelete.name}" deleted successfully`,
      });
      playNotificationSound();
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast({
        title: "Delete Failed",
        description: err.message || "Could not delete EA.",
        variant: "destructive"
      });
      playNotificationSound();
    } finally {
      setEAToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
        <div className="animate-scale-in">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="animate-scale-in glass-card" style={{ animationDelay: "150ms" }}>
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
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <Bot className="w-8 h-8 text-primary" /> Manage Expert Advisors
        </h1>
        <p className="text-muted-foreground">
          Register new automated robots, update credentials, configurations, and descriptive pages
        </p>
      </div>

      {/* Add New EA Form */}
      <Card className="glass-card border-white/10 relative overflow-hidden bg-black/40 shadow-xl">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Register Expert Advisor</CardTitle>
            <p className="text-sm text-muted-foreground">
              Define the new EA code and catalog definitions
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ea-name">Expert Advisor Name</Label>
              <Input
                id="ea-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. SMC Trend Rider"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="confirm-ea" 
                checked={formData.confirmed}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, confirmed: checked as boolean }))}
              />
              <Label htmlFor="confirm-ea" className="text-xs text-white/80 cursor-pointer">
                I confirm that I want to add this Expert Advisor to the database system.
              </Label>
            </div>

            <Button type="submit" disabled={isSubmitting} className="shadow-lg shadow-primary/25">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Provisioning...
                </>
              ) : (
                <>Register EA</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* EAs Grid & Table Container */}
      <Card className="bg-gradient-card border-border glass-card">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center border border-accent/20">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Expert Advisors Catalog</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure parameters, branding, and images
            </p>
          </div>
        </CardHeader>
        <CardContent>
          
          {/* Mobile optimized card layout (no horizontal scrolling) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {eas.length === 0 ? (
              <div className="col-span-full text-center p-8 border border-dashed border-white/10 rounded-2xl">
                <p className="text-muted-foreground text-sm">No registered Expert Advisors found.</p>
              </div>
            ) : (
              eas.map((ea) => (
                <div 
                  key={ea.id} 
                  className="p-5 rounded-2xl border border-white/10 bg-black/40 flex flex-col justify-between space-y-4"
                  style={{ borderLeft: `4px solid ${ea.color}` }}
                >
                  <div className="space-y-1">
                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                      {ea.image ? (
                        <img src={ea.image} alt={ea.name} className="w-6 h-6 rounded-md object-cover" />
                      ) : (
                        <Bot className="w-5 h-5" style={{ color: ea.color }} />
                      )}
                      {ea.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">Code: {ea.code}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-3">
                    <div>
                      <span className="text-muted-foreground block">Total Users</span>
                      <span className="font-semibold text-white">{ea.totalUsers.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Active Seats</span>
                      <span className="font-semibold text-success">{ea.activeUsers.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 bg-white/5 border-white/10 text-white text-xs gap-1 hover:bg-white/10"
                      onClick={() => navigate(`/dashboard/ea/${ea.id}/manage`)}
                    >
                      <Settings className="w-3.5 h-3.5" /> Manage EA
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="hover:bg-destructive/10 text-rose-500 hover:text-rose-400 shrink-0"
                      onClick={() => handleDelete(ea)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table view (MD screen and larger) */}
          <div className="hidden md:block rounded-md border border-border/50 overflow-hidden bg-background/20">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-medium min-w-[200px]">Robot Name</TableHead>
                  <TableHead className="font-medium text-center">Total Users</TableHead>
                  <TableHead className="font-medium text-center">Active Seats</TableHead>
                  <TableHead className="font-medium">System Code</TableHead>
                  <TableHead className="font-medium">Registered Date</TableHead>
                  <TableHead className="w-24 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center p-8 text-muted-foreground">
                      No registered Expert Advisors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  eas.map((ea) => (
                    <TableRow key={ea.id} className="hover:bg-muted/20 transition-colors border-border/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {ea.image ? (
                            <img src={ea.image} alt={ea.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                              <Bot className="w-4 h-4" style={{ color: ea.color }} />
                            </div>
                          )}
                          <div>
                            <div className="text-white text-sm font-semibold">{ea.name}</div>
                            <div className="text-[10px] text-muted-foreground">ID: {ea.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-white">
                        {ea.totalUsers.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-success">
                            {ea.activeUsers.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {ea.totalUsers > 0 ? Math.round((ea.activeUsers / ea.totalUsers) * 100) : 0}% active
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-black/40 border border-white/10 px-2 py-1 rounded font-mono text-primary">
                          {ea.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {ea.createdAt}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 hover:bg-accent"
                            onClick={() => navigate(`/dashboard/ea/${ea.id}/manage`)}
                          >
                            <Edit className="w-4 h-4 text-white/80" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(ea)}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-modal border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5" /> Delete Expert Advisor
            </DialogTitle>
            <DialogDescription className="text-white/70 mt-2">
              Are you sure you want to delete <strong>"{eaToDelete?.name}"</strong>? This will permanently delete the product from the catalog. 
              All active licenses and activation seats associated with this EA ID will cascade and delete.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="bg-white/5 border-white/10 text-white rounded-xl" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl shadow-lg shadow-rose-500/20" onClick={confirmDelete}>
              Delete Robot
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}