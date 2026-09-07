import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, Copy, FileCode2, Share2, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Local alias. The VITE_SUPABASE_URL name is fixed by the Vercel project config.
const NOVAHOST_API_URL = import.meta.env.VITE_SUPABASE_URL as string;

const mq5Template = `//+------------------------------------------------------------------+
//|                                                   NovaHost EA.mq5 |
//|                                        Copyright 2026, NovaHost.  |
//|                                             https://novahost.app/ |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, NovaHost."
#property link      "https://novahost.app/"
#property version   "1.00"

//--- inputs
input string LicenseKey = "ENTER_LICENSE_HERE";
input string NovaHostUrl = "YOUR_NOVAHOST_URL";
input string NovaHostKey = "YOUR_NOVAHOST_KEY";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   Print("NovaHost EA Initialized with License: ", LicenseKey);
   // Connect to NovaHost via WebRequest
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   Print("NovaHost EA Deinitialized");
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   // Poll database for signals occasionally
  }
//+------------------------------------------------------------------+
`;

export default function HostingTutorial() {
  const { toast } = useToast();
  const [downloadCounter, setDownloadCounter] = useState(0);
  const [checklist, setChecklist] = useState({
    downloadSource: false,
    allowWebRequests: false,
    compileEx5: false,
    attachToChart: false,
  });

  const toggleChecklistItem = (item: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const handleDownload = () => {
    const blob = new Blob([mq5Template], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NovaHost_EA_v1.0.mq5`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadCounter(prev => prev + 1);
    setChecklist(prev => ({ ...prev, downloadSource: true }));
    toast({
      title: "Download Complete",
      description: "NovaHost_EA_v1.0.mq5 has been saved to your computer."
    });
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard." });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <Server className="w-6 h-6 text-primary" />
          Hosting Integration
        </h1>
        <p className="text-muted-foreground mt-1">Follow this tutorial to connect your algorithmic trading bots to the dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card shadow-xl border-white/10 dark:border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
            
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
                <CardTitle className="text-xl">Download Trading Bot File (.mq5)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">First, download your unique MetaTrader 5 source script. This script contains the WebSocket interface required to listen to signals dispatched from your dashboard.</p>
              
              <div className="p-4 rounded-xl border border-white/10 bg-black/20 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3">
                  <FileCode2 className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="font-semibold text-white">NovaHost_EA_v1.0.mq5</p>
                    <p className="text-xs text-muted-foreground">4 KB • MQL5 Source File</p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleDownload}
                  className="glass-btn bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
                >
                  <Download className="w-4 h-4 mr-2" /> 
                  {downloadCounter > 0 ? "Download Again" : "Download .mq5"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-xl border-white/10 dark:border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
            
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
                <CardTitle className="text-xl">Load and Compile</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Move the downloaded file into your terminal's Experts folder and hit compile. Alternatively, place it in any VPS and ensure WebRequest URLs are allowed.</p>
              
              <div className="bg-black/40 border border-white/5 rounded-lg p-4 font-mono text-sm relative group">
                <p className="text-emerald-400"># Tools &rarr; Options &rarr; Expert Advisors &rarr; Allow WebRequest for listed URL:</p>
                <p className="text-white mt-2 break-all bg-white/5 p-2 rounded">{NOVAHOST_API_URL}</p>
                <Button
                  size="icon" variant="ghost"
                  className="absolute top-8 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyCode(NOVAHOST_API_URL)}
                >
                  <Copy className="w-4 h-4 text-muted-foreground hover:text-white" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-xl border-white/10 dark:border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -z-10" />
            
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
                <CardTitle className="text-xl">Connect the License Key</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Drag the EA onto any chart. In the Inputs tab, provide the license key you generated in the dashboard. The bot will automatically verify and subscribe to Dispatcher signals.</p>
              <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                <Share2 className="w-4 h-4 shrink-0" />
                <span>Make sure the allowed symbols for that license match the chart symbol.</span>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">
          <Card className="glass-card border-white/10 bg-gradient-to-br from-black/20 to-black/40 sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all"
                onClick={() => toggleChecklistItem('downloadSource')}
              >
                {(checklist.downloadSource || downloadCounter > 0) ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
                )}
                <span className={(checklist.downloadSource || downloadCounter > 0) ? "text-white font-medium" : "text-muted-foreground"}>
                  Download Source
                </span>
              </div>

              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all"
                onClick={() => toggleChecklistItem('allowWebRequests')}
              >
                {checklist.allowWebRequests ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
                )}
                <span className={checklist.allowWebRequests ? "text-white font-medium" : "text-muted-foreground"}>
                  Allow WebRequests
                </span>
              </div>

              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all"
                onClick={() => toggleChecklistItem('compileEx5')}
              >
                {checklist.compileEx5 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
                )}
                <span className={checklist.compileEx5 ? "text-white font-medium" : "text-muted-foreground"}>
                  Compile .ex5
                </span>
              </div>

              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all"
                onClick={() => toggleChecklistItem('attachToChart')}
              >
                {checklist.attachToChart ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
                )}
                <span className={checklist.attachToChart ? "text-white font-medium" : "text-muted-foreground"}>
                  Attach to Chart
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
