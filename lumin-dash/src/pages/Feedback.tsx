import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, ArrowUp, ArrowDown, Sparkles, Send, Filter, CheckCircle2 } from "lucide-react";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: "Mobile App" | "Web Portal";
  upvotes: number;
  downvotes: number;
  userVoted?: "up" | "down";
  createdAt: string;
}

const initialRequests: FeatureRequest[] = [
  {
    id: "1",
    title: "Multi-broker copytrading sync",
    description: "Allow linking multiple MT5 accounts simultaneously so a single signal broadcast replicates across different prop firms.",
    category: "Mobile App",
    upvotes: 42,
    downvotes: 2,
    createdAt: "June 02, 2026",
  },
  {
    id: "2",
    title: "Symbol mapping overrides",
    description: "Add a mapping dashboard to map non-standard broker suffixes (e.g., XAUUSD.raw or GOLD.pro) to standard symbols automatically.",
    category: "Web Portal",
    upvotes: 28,
    downvotes: 1,
    createdAt: "May 30, 2026",
  },
  {
    id: "3",
    title: "Push notifications for SL/TP hits",
    description: "Send instant push alerts to the iOS/Android app when a dispatcher signal closes at its target Take Profit or Stop Loss.",
    category: "Mobile App",
    upvotes: 19,
    downvotes: 0,
    createdAt: "May 28, 2026",
  },
  {
    id: "4",
    title: "Live performance charts scanner",
    description: "Integrate a beautiful chart preview on the dispatcher page using TradingView lightweight charts library.",
    category: "Web Portal",
    upvotes: 12,
    downvotes: 3,
    createdAt: "May 25, 2026",
  }
];

/**
 * @description Feedback board allowing admins/users to view, submit, and vote on feature suggestions for NovaHost platforms.
 */
export default function Feedback() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<FeatureRequest[]>(initialRequests);
  const [filter, setFilter] = useState<"All" | "Mobile App" | "Web Portal">("All");
  
  // Form states initialized properly
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"Mobile App" | "Web Portal">("Mobile App");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in the title and description.",
        variant: "destructive",
      });
      return;
    }

    const newRequest: FeatureRequest = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      category: category,
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    };

    setRequests(prev => [newRequest, ...prev]);
    setTitle("");
    setDescription("");
    toast({
      title: "Request Submitted",
      description: "Thank you! Your suggestion has been published to the feature board.",
    });
  };

  const handleVote = (id: string, voteType: "up" | "down") => {
    setRequests(prev =>
      prev.map(req => {
        if (req.id !== id) return req;

        let upChange = 0;
        let downChange = 0;
        let nextVoted: "up" | "down" | undefined = voteType;

        if (req.userVoted === voteType) {
          // Undo vote
          if (voteType === "up") upChange = -1;
          else downChange = -1;
          nextVoted = undefined;
        } else {
          // Switch vote or make new vote
          if (req.userVoted === "up") upChange = -1;
          if (req.userVoted === "down") downChange = -1;

          if (voteType === "up") upChange += 1;
          else downChange += 1;
        }

        return {
          ...req,
          upvotes: req.upvotes + upChange,
          downvotes: req.downvotes + downChange,
          userVoted: nextVoted,
        };
      })
    );
  };

  const filteredRequests = requests.filter(
    req => filter === "All" || req.category === filter
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Feedback Board
          </h1>
          <p className="text-muted-foreground">Submit and vote on feature requests for the NovaHost ecosystem</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Submit Form Card */}
        <Card className="lg:col-span-1 bg-gradient-card border-border glass-card h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Suggest Feature
            </CardTitle>
            <CardDescription>Tell us what we should build next.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="req-title">Feature Title</Label>
                <Input
                  id="req-title"
                  placeholder="e.g. Dark Mode widgets"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-background/50 backdrop-blur-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-category">Platform Category</Label>
                <Select 
                  value={category} 
                  onValueChange={(val: "Mobile App" | "Web Portal") => setCategory(val)}
                >
                  <SelectTrigger id="req-category" className="bg-background/50 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-modal">
                    <SelectItem value="Mobile App">Mobile App (iOS/Android)</SelectItem>
                    <SelectItem value="Web Portal">Web Admin Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-desc">Description</Label>
                <Textarea
                  id="req-desc"
                  placeholder="Explain why this feature is useful and how it should work..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="bg-background/50 backdrop-blur-sm resize-none"
                />
              </div>

              <Button type="submit" className="w-full flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(59,130,246,0.25)]">
                <Send className="w-4 h-4" /> Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Requests List */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 dark:bg-black/20 p-3 rounded-2xl border border-border/50 backdrop-blur-sm glass-card">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Filter Platform
            </span>
            <div className="flex gap-2">
              {(["All", "Mobile App", "Web Portal"] as const).map(cat => (
                <Button
                  key={cat}
                  variant={filter === cat ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(cat)}
                  className={`rounded-xl px-4 py-1.5 text-xs font-semibold ${filter === cat ? "shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-border/50 rounded-2xl bg-white/5 backdrop-blur-sm">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground text-sm">No feature requests found for this category.</p>
              </div>
            ) : (
              filteredRequests.map(req => {
                const score = req.upvotes - req.downvotes;
                return (
                  <div 
                    key={req.id} 
                    className="flex gap-4 p-5 rounded-2xl border border-border/50 bg-gradient-card backdrop-blur-sm hover:border-primary/30 transition-all duration-300 glass-card animate-in fade-in slide-in-from-bottom-2"
                  >
                    {/* Voting Controls */}
                    <div className="flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-xl bg-black/20 border border-white/5 h-fit min-w-[40px]">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVote(req.id, "up")}
                        className={`w-7 h-7 hover:bg-white/10 rounded-lg ${req.userVoted === "up" ? "text-emerald-500 hover:text-emerald-400 bg-emerald-500/10" : "text-muted-foreground"}`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <span className={`font-mono text-sm font-bold ${score > 0 ? "text-emerald-400" : score < 0 ? "text-rose-400" : "text-muted-foreground"}`}>
                        {score}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVote(req.id, "down")}
                        className={`w-7 h-7 hover:bg-white/10 rounded-lg ${req.userVoted === "down" ? "text-rose-500 hover:text-rose-400 bg-rose-500/10" : "text-muted-foreground"}`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge 
                          variant="secondary" 
                          className={req.category === "Mobile App" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"}
                        >
                          {req.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">{req.createdAt}</span>
                      </div>
                      
                      <h3 className="text-base font-bold text-white tracking-tight">{req.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{req.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
