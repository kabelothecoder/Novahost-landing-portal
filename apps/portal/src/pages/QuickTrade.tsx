import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { DispatchStatus } from "@/components/DispatchStatus";
import { ALL_ROBOTS, useTradeDispatch, type Side } from "@/hooks/useTradeDispatch";

/**
 * The fast path: symbol, optionally a lot, then one press.
 *
 * Direction is the button rather than a separate toggle above a separate submit
 * — on a screen whose whole purpose is speed, choosing a side and then
 * confirming it was two actions for one decision. Everything else lives on
 * Normal Trade.
 */
export default function QuickTrade() {
  const { toast } = useToast();
  const {
    products,
    targetId,
    setTargetId,
    targetName,
    availablePairs,
    activeTerminals,
    clientsReached,
    lastSignalSent,
    lastSignalIds,
    isSending,
    send,
  } = useTradeDispatch();

  const [pair, setPair] = useState("");
  const [lot, setLot] = useState("");
  const [pendingSide, setPendingSide] = useState<Side | null>(null);

  // Keep the selection inside the list. Switching robots must never leave a
  // symbol selected that the new target does not carry -- the send would be
  // refused per licence and the mentor would have no idea why.
  useEffect(() => {
    if (availablePairs.length === 0) {
      if (pair) setPair("");
      return;
    }
    if (!availablePairs.includes(pair)) setPair(availablePairs[0]);
  }, [availablePairs, pair]);

  const handleSend = async (side: Side) => {
    if (!pair) {
      // Says which of the two reasons it is. "Pick a pair" is unhelpful advice
      // when the dropdown is empty because the robot carries no symbols -- the
      // fix is in the robot editor, not on this screen.
      toast({
        title: availablePairs.length === 0 ? "This robot has no symbols" : "Pick a pair",
        description:
          availablePairs.length === 0
            ? "Add the instruments it is allowed to trade under Expert Advisors, then come back."
            : "Choose the instrument to signal.",
        variant: "destructive",
      });
      return;
    }

    const lotValue = lot ? Number(lot) : null;
    if (lotValue !== null && (Number.isNaN(lotValue) || lotValue <= 0 || lotValue > 50)) {
      toast({
        title: "Check the lot size",
        description: "Leave it blank, or enter a size between 0.01 and 50.",
        variant: "destructive",
      });
      return;
    }

    setPendingSide(side);
    const result = await send({
      pair,
      side,
      lot: lotValue,
      sl: null,
      tp: null,
      orderType: "MARKET",
      entryPrice: null,
      expirySeconds: null,
    });
    setPendingSide(null);

    if (!result.ok) {
      toast({
        title: "Broadcast failed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    // Says who it went to, and says it plainly when that is nobody. "Signal
    // Broadcasted" alone was true and useless: the call succeeds whether it
    // reaches a hundred handsets or none.
    toast({
      title: activeTerminals > 0 ? "Signal broadcast" : "Signal saved — no terminals online",
      description:
        activeTerminals > 0
          ? `${side.toUpperCase()} ${pair} sent to ${targetName} — ${activeTerminals} terminal${activeTerminals === 1 ? "" : "s"} online.`
          : `${side.toUpperCase()} ${pair} was recorded for ${targetName}, but nothing will trade until a terminal comes online.`,
      variant: activeTerminals > 0 ? undefined : "destructive",
    });
  };

  const noSymbols = availablePairs.length === 0;

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="h-fit">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border px-5 py-3.5">
          <CardTitle>Market order</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <Link to="/dispatcher/normal-trade">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Full ticket
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qt-robot">Robot</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id="qt-robot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ROBOTS}>All robots</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qt-pair">Symbol</Label>
              <Select value={pair} onValueChange={setPair} disabled={noSymbols}>
                <SelectTrigger id="qt-pair">
                  <SelectValue placeholder={noSymbols ? "No symbols configured" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {availablePairs.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Points at the fix rather than leaving an empty dropdown to be interpreted. */}
          {noSymbols && (
            <p className="text-xs text-muted-foreground">
              {targetId === ALL_ROBOTS
                ? "None of your robots have symbols configured. Add them under Expert Advisors."
                : "This robot has no symbols configured. Add them under Expert Advisors."}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="qt-lot">
              Lot size <span className="font-normal text-muted-foreground">— optional</span>
            </Label>
            <Input
              id="qt-lot"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              placeholder="Each trader's own sizing"
              className="tabular"
            />
            <p className="text-xs text-muted-foreground">
              Left blank, every subscriber's own sizing plan decides. A number here overrides
              all of them.
            </p>
          </div>

          {/*
            The only saturated blocks on the screen, and they commit the trade.
            Direction is the press.
          */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <Button
              variant="long"
              size="lg"
              disabled={isSending || noSymbols}
              onClick={() => handleSend("buy")}
            >
              {pendingSide === "buy" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy"}
            </Button>
            <Button
              variant="short"
              size="lg"
              disabled={isSending || noSymbols}
              onClick={() => handleSend("sell")}
            >
              {pendingSide === "sell" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sell"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <DispatchStatus
        activeTerminals={activeTerminals}
        clientsReached={clientsReached}
        lastSignalSent={lastSignalSent}
        hasSent={lastSignalIds.length > 0}
      />
    </div>
  );
}
