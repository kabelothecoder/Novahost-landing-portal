import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RobotArtPreview } from "@/components/RobotArtPreview";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Upload, Link, X, Bold, Italic, Eye, Palette,
  Save, RotateCcw, AlertTriangle, Sparkles, Layout, Settings
} from "lucide-react";
import { novaHost } from "@/integrations/novahost/client";
import { playNotificationSound } from "@/lib/notify";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AVAILABLE_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "XAGUSD", 
  "NAS100", "US30", "SPX500", "BTCUSD", "ETHUSD", "VIX"
];

/**
 * @description ManageEA component handles configuration of details (name, description, images, color theme) for a specific EA (product).
 */
export default function ManageEA() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [symbols, setSymbols] = useState<string[]>([]);
  const [ttsScript, setTtsScript] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [isActive, setIsActive] = useState(true);

  // Original state for dirty checking
  const [originalData, setOriginalData] = useState<{
    name: string;
    displayName: string;
    symbols: string[];
    ttsScript: string;
    description: string;
    imageUrl: string;
    accentColor: string;
  } | null>(null);

  const [formErrors, setFormErrors] = useState<{ name?: string; description?: string; image?: string }>({});

  const loadEA = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data: sessionData } = await novaHost.auth.getSession();
      if (!sessionData?.session) {
        setIsLoading(false);
        return;
      }
      const userId = sessionData.session.user.id;

      const { data, error } = await novaHost
        .from("expert_advisors")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ title: "Not Found", description: "The requested EA does not exist.", variant: "destructive" });
        navigate("/manage");
        return;
      }

      setName(data.name || "");
      setDisplayName(data.display_name || "");
      setSymbols(Array.isArray(data.symbols) ? data.symbols : []);
      setTtsScript(data.tts_script || "");
      setDescription(data.description || "");
      setImageUrl(data.avatar_url || "");
      setAccentColor(data.accent_color || "#3b82f6");
      
      const loaded = {
        name: data.name || "",
        displayName: data.display_name || "",
        symbols: Array.isArray(data.symbols) ? data.symbols : [],
        ttsScript: data.tts_script || "",
        description: data.description || "",
        imageUrl: data.avatar_url || "",
        accentColor: data.accent_color || "#3b82f6",
      };
      setOriginalData(loaded);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error Loading EA", description: err.message, variant: "destructive" });
      navigate("/manage");
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    loadEA();
  }, [loadEA]);

  const hasUnsavedChanges = originalData ? (
    name !== originalData.name ||
    displayName !== originalData.displayName ||
    JSON.stringify([...symbols].sort()) !== JSON.stringify([...originalData.symbols].sort()) ||
    ttsScript !== originalData.ttsScript ||
    description !== originalData.description ||
    imageUrl !== originalData.imageUrl ||
    accentColor !== originalData.accentColor
  ) : false;

  const handleReset = () => {
    if (originalData) {
      setName(originalData.name);
      setDisplayName(originalData.displayName);
      setSymbols(originalData.symbols);
      setTtsScript(originalData.ttsScript);
      setDescription(originalData.description);
      setImageUrl(originalData.imageUrl);
      setAccentColor(originalData.accentColor);
      setFormErrors({});
      toast({ description: "Form fields reset to original settings." });
    }
  };

  const validateForm = (): boolean => {
    const errors: { name?: string; description?: string; image?: string } = {};
    if (!name.trim()) errors.name = "EA Name is required.";
    if (name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id) {
      playNotificationSound();
      return;
    }

    setIsSaving(true);
    try {
      const { data: sessionData } = await novaHost.auth.getSession();
      const userId = sessionData?.session?.user.id;
      if (!userId) throw new Error("No active session found.");

      const { error } = await novaHost
        .from("expert_advisors")
        .update({
          name: name.trim(),
          display_name: displayName.trim(),
          symbols: symbols,
          tts_script: ttsScript.trim(),
          description: description.trim(),
          avatar_url: imageUrl.trim(),
          accent_color: accentColor,
        })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      toast({ title: "Success", description: "Expert Advisor details updated successfully." });
      setOriginalData({
        name: name.trim(),
        displayName: displayName.trim(),
        symbols: symbols,
        ttsScript: ttsScript.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        accentColor: accentColor
      });
      playNotificationSound();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
      playNotificationSound();
    } finally {
      setIsSaving(false);
    }
  };

  // Image Upload Handlers (converts image file to Base64 data URI)
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Only image files are supported.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card className="glass-card border-white/10">
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-xl bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white transition-all shrink-0"
          onClick={() => navigate("/manage")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              EA Profile Configuration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{name || "Configure EA"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Customize images, settings, parameter overrides, and public descriptions</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Visuals & Theme */}
        <div className="lg:col-span-1 space-y-6">
          {/* Accent color & Info */}
          <Card className="glass-card border-white/10 overflow-hidden">
            <CardHeader className="p-5 border-b border-white/5 bg-gradient-to-r from-card to-black/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <Palette className="w-4 h-4 text-primary" /> Visual Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="color-picker" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accent Theme Color</Label>
                <div className="flex gap-3">
                  <Input
                    id="color-picker"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-12 h-10 p-0 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1 bg-white/5 border-white/10 text-white font-mono text-sm uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Override</Label>
                <div className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl">
                  <span className="text-xs text-white/80">Visible for licensing</span>
                  <Switch 
                    checked={isActive} 
                    onCheckedChange={setIsActive} 
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media uploader */}
          <Card className="glass-card border-white/10 overflow-hidden">
            <CardHeader className="p-5 border-b border-white/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <Upload className="w-4 h-4 text-secondary" /> Media & Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Dropzone */}
              <div
                className={`relative border border-dashed rounded-xl p-4 transition-all duration-200 text-center ${
                  dragActive ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              >
                <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-white/80 font-medium">Drag EA image here</p>
                <button
                  type="button"
                  className="text-[10px] text-primary underline mt-1 block w-full text-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  or click to select
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* URL fallback */}
              <div className="space-y-1.5">
                <Label htmlFor="image-url" className="text-xs text-muted-foreground">Image URL</Label>
                <div className="relative">
                  <Input
                    id="image-url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="bg-white/5 border-white/10 text-white text-xs pl-8"
                  />
                  <Link className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-3" />
                  {imageUrl && (
                    <button
                      type="button"
                      className="absolute right-2.5 top-3 text-muted-foreground hover:text-white"
                      onClick={() => setImageUrl("")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Live preview — renders the art exactly as the app will, so the
                  mentor sees the crop, accent tint and scrim before saving.
                  Always shown: with no image it previews the initials fallback,
                  which is what buyers actually get. */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">In the app</Label>
                  {imageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-white"
                    >
                      Clear image
                    </Button>
                  )}
                </div>
                <RobotArtPreview
                  imageUrl={imageUrl}
                  accentColor={accentColor}
                  displayName={displayName || name}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Main fields & Markdown Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card border-white/10">
            <CardContent className="p-6 space-y-6">
              
              {/* Name field */}
              <div className="space-y-2">
                <Label htmlFor="ea-name" className="text-sm font-semibold text-white">Expert Advisor Name</Label>
                <Input
                  id="ea-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SMC Trend Rider"
                  className={`bg-white/5 border-white/10 text-white ${formErrors.name ? "border-rose-500/50" : ""}`}
                />
                {formErrors.name && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {formErrors.name}
                  </p>
                )}
              </div>

              {/* Display Name field */}
              <div className="space-y-2">
                <Label htmlFor="ea-display-name" className="text-sm font-semibold text-white">Display Name</Label>
                <Input
                  id="ea-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. SMC Trend Rider Pro"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Allowed Trading Symbols/Quotes (Dynamic Tag Input) */}
              <div className="space-y-3 pt-2">
                <Label htmlFor="custom-symbol-input" className="text-sm font-semibold text-white">Allowed Trading Symbols/Quotes</Label>
                
                {/* Active Tags */}
                <div className="flex flex-wrap gap-2 min-h-10 p-3 bg-black/40 border border-white/10 rounded-xl">
                  {symbols.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic self-center">No symbols configured. (All symbols allowed)</span>
                  ) : (
                    symbols.map(sym => (
                      <Badge 
                        key={sym} 
                        className="bg-primary hover:bg-primary/80 text-white flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.25)] border border-primary/20"
                      >
                        <span className="text-xs font-mono font-bold">{sym}</span>
                        <button 
                          type="button" 
                          onClick={() => setSymbols(prev => prev.filter(s => s !== sym))}
                          className="hover:bg-white/20 rounded-md p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                {/* Input to add custom quote */}
                <div className="flex gap-2">
                  <Input 
                    id="custom-symbol-input"
                    placeholder="Enter custom symbol (e.g. GBPUSD)"
                    className="bg-white/5 border-white/10 text-white text-xs font-mono uppercase"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim().toUpperCase();
                        if (val && !symbols.includes(val)) {
                          setSymbols(prev => [...prev, val]);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 shrink-0 px-4"
                    onClick={() => {
                      const input = document.getElementById("custom-symbol-input") as HTMLInputElement;
                      if (input) {
                        const val = input.value.trim().toUpperCase();
                        if (val && !symbols.includes(val)) {
                          setSymbols(prev => [...prev, val]);
                          input.value = "";
                        }
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>

                {/* Quick select / Suggested Symbols */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Suggested Symbols</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {AVAILABLE_SYMBOLS.map(sym => {
                      const isSelected = symbols.includes(sym);
                      return (
                        <button
                          key={sym}
                          type="button"
                          disabled={isSelected}
                          className={`text-xs font-mono font-semibold px-2 py-1 rounded-md border transition-all ${
                            isSelected 
                              ? "bg-primary/20 border-primary/30 text-primary-foreground/50 opacity-50 cursor-not-allowed" 
                              : "border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                          onClick={() => {
                            if (!symbols.includes(sym)) {
                              setSymbols(prev => [...prev, sym]);
                            }
                          }}
                        >
                          +{sym}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Custom TTS Announcement */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="ea-tts-script" className="text-sm font-semibold text-white">Custom TTS Announcement</Label>
                  <span className="text-[10px] text-muted-foreground italic">Speaks aloud on mobile app load</span>
                </div>
                <Textarea
                  id="ea-tts-script"
                  value={ttsScript}
                  onChange={(e) => setTtsScript(e.target.value)}
                  placeholder="e.g., Wakanda AI has optimized liquidity and is ready to execute trades."
                  rows={3}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
              </div>

              {/* Markdown description tabs */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-white">Public Description</Label>
                <Tabs defaultValue="editor" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-white/10 rounded-xl p-1">
                    <TabsTrigger value="editor" className="rounded-lg text-xs">Editor</TabsTrigger>
                    <TabsTrigger value="preview" className="rounded-lg text-xs flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Preview</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="editor" className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-1 p-1 bg-white/5 border border-white/10 rounded-lg items-center text-xs">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 hover:bg-white/10"
                        onClick={() => {
                          const ta = document.getElementById("ea-desc-textarea") as HTMLTextAreaElement;
                          if (ta) {
                            const start = ta.selectionStart;
                            const end = ta.selectionEnd;
                            const val = ta.value;
                            setDescription(val.substring(0, start) + `**${val.substring(start, end)}**` + val.substring(end));
                          }
                        }}
                      >
                        <Bold className="w-3.5 h-3.5 text-white" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 hover:bg-white/10"
                        onClick={() => {
                          const ta = document.getElementById("ea-desc-textarea") as HTMLTextAreaElement;
                          if (ta) {
                            const start = ta.selectionStart;
                            const end = ta.selectionEnd;
                            const val = ta.value;
                            setDescription(val.substring(0, start) + `*${val.substring(start, end)}*` + val.substring(end));
                          }
                        }}
                      >
                        <Italic className="w-3.5 h-3.5 text-white" />
                      </Button>
                      <Separator orientation="vertical" className="h-4 bg-white/10 mx-1" />
                      <span className="text-[10px] text-muted-foreground">Markdown syntax supported</span>
                    </div>
                    
                    <Textarea
                      id="ea-desc-textarea"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Explain features, risk limits, optimal timeframes, pairs..."
                      rows={8}
                      className="bg-white/5 border-white/10 text-white text-sm resize-none"
                    />
                  </TabsContent>

                  <TabsContent value="preview" className="mt-3">
                    <div className="p-4 rounded-xl border border-white/10 bg-black/40 min-h-[200px] text-sm overflow-y-auto max-h-[300px]">
                      {description ? (
                        <div className="prose prose-sm dark:prose-invert text-white/80 [&>h1]:text-white [&>h2]:text-white [&>h3]:text-white [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {description}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic text-xs">No description text written yet.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                    disabled={!hasUnsavedChanges || isSaving}
                    onClick={handleReset}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Reset
                  </Button>
                </div>
                <Button
                  type="submit"
                  className="bg-primary text-white rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Changes
                    </>
                  )}
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
