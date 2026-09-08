import { useEffect, useMemo, useState } from "react";
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
import { Loader2, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DispatchStatus } from "@/components/DispatchStatus";
import {
  ALL_ROBOTS,
  useTradeDispatch,
  type OrderKind,
  type Side,
} from "@/hooks/useTradeDispatch";

const ORDER_KINDS: Array<{ value: OrderKind; label: string; hint: string }> = [
  { value: "MARKET", label: "Market", hint: "Fills at whatever price the subscriber's broker is showing." },
  { value: "LIMIT", label: "Limit", hint: "Waits for price to come back to your level." },
  { value: "STOP", label: "Stop", hint: "Waits for price to break through your level." },
];

const EXPIRIES: Array<{ value: string; label: string; seconds: number | null }> = [
  { value: "GTC", label: "Good till cancelled", seconds: null },
  { value: "1H", label: "1 hour", seconds: 3_600 },
  { value: "4H", label: "4 hours", seconds: 14_400 },
  { value: "24H", label: "24 hours", seconds: 86_400 },
];

const num = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * The full ticket: everything the executor can act on.
 *
 * Quick Trade covers the common case in one press. This screen exists for the
 * calls that need a level — "buy the retest at 1.0850" — which a market order
 * cannot express, and which `metacopier-execute` supports through the four
 * pending order types.
 */
export default function NormalTrade() {
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
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderKind>("MARKET");
  const [entry, setEntry] = useState("");
  const [lot, setLot] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [expiry, setExpiry] = useState("GTC");

  const isPending = orderType !== "MARKET";

  useEffect(() => {
    if (availablePairs.length === 0) {
      if (pair) setPair("");
      return;
    }
    if (!availablePairs.includes(pair)) setPair(availablePairs[0]);
  }, [availablePairs, pair]);

  /**
   * Everything wrong with the ticket, in the order a person would fix it.
   *
   * The stop/target checks only run for pending orders, because that is the
   * only case where the entry is known. A market order's fill price is whatever
   * the subscriber's broker shows at the time, so there is nothing here to
   * compare against — the executor cannot quote either.
   */
  const problems = useMemo(() => {
    const list: string[] = [];
    const entryVal = num(entry);
    const slVal = num(sl);
    const tpVal = num(tp);
    const lotVal = num(lot);

    if (!pair) list.push("Choose a symbol.");
    if (lotVal !== null && (lotVal <= 0 || lotVal > 50))
      list.push("Lot size must be between 0.01 and 50, or blank.");
    if (slVal !== null && slVal <= 0) list.push("Stop loss must be above zero, or blank.");
    if (tpVal !== null && tpVal <= 0) list.push("Take profit must be above zero, or blank.");

    if (isPending) {
      if (entryVal === null || entryVal <= 0) {
        list.push(`A ${orderType.toLowerCase()} order needs the price to wait at.`);
      } else {
        if (side === "buy") {
          if (slVal !== null && slVal >= entryVal)
            list.push("On a buy, the stop must sit below the entry.");
          if (tpVal !== null && tpVal <= entryVal)
            list.push("On a buy, the target must sit above the entry.");
        } else {
          if (slVal !== null && slVal <= entryVal)
            list.push("On a sell, the stop must sit above the entry.");
          if (tpVal !== null && tpVal >= entryVal)
            list.push("On a sell, the target must sit below the entry.");
        }
      }
    }

    return list;
  }, [pair, lot, sl, tp, entry, side, orderType, isPending]);

  const noSymbols = availablePairs.length === 0;
  const canSend = problems.length === 0 && !noSymbols && !isSending;

  const handleSend = async () => {
    if (problems.length > 0) {
      toast({ title: "Check the ticket", description: problems[0], variant: "destructive" });
      return;
    }

    const result = await send({
      pair,
      side,
      lot: num(lot),
      sl: num(sl),
      tp: num(tp),
      orderType,
      entryPrice: isPending ? num(entry) : null,
      expirySeconds: isPending
        ? EXPIRIES.find((e) => e.value === expiry)?.seconds ?? null
        : null,
    });

    if (!result.ok) {
      toast({ title: "Broadcast failed", description: result.error, variant: "destructive" });
      return;
    }

    toast({
      title: activeTerminals > 0 ? "Signal broadcast" : "Signal saved — no terminals online",
      description:
        activeTerminals > 0
          ? `${side.toUpperCase()} ${pair} sent to ${targetName} — ${activeTerminals} terminal${activeTerminals === 1 ? "" : "s"} online.`
          : `${side.toUpperCase()} ${pair} was recorded for ${targetName}, but nothing will trade until a terminal comes online.`,
      variant: activeTerminals > 0 ? undefined : "destructive",
    });

    // Levels belong to the call that was just made; carrying them into the next
    // ticket is how a stop from one idea ends up on another.
    setEntry("");
    setSl("");
    setTp("");
  };

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border px-5 py-3.5">
            <CardTitle>Order ticket</CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
              <Link to="/dispatcher/quick-trade">
                <Zap className="h-3.5 w-3.5" />
                Quick trade
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nt-robot">Robot</Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger id="nt-robot">
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
                <Label htmlFor="nt-pair">Symbol</Label>
                <Select value={pair} onValueChange={setPair} disabled={noSymbols}>
                  <SelectTrigger id="nt-pair">
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

            {noSymbols && (
              <p className="text-xs text-muted-foreground">
                {targetId === ALL_ROBOTS
                  ? "None of your robots have symbols configured. Add them under Expert Advisors."
                  : "This robot has no symbols configured. Add them under Expert Advisors."}
              </p>
            )}

            {/* Direction */}
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["buy", "sell"] as Side[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    aria-pressed={side === s}
                    className={cn(
                      "h-9 rounded-md border text-sm font-medium capitalize transition-colors",
                      side === s && s === "buy" && "border-long bg-long/10 text-long",
                      side === s && s === "sell" && "border-short bg-short/10 text-short",
                      side !== s && "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Order type */}
            <div className="space-y-1.5">
              <Label>Order type</Label>
              <div className="grid grid-cols-3 gap-2">
                {ORDER_KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setOrderType(k.value)}
                    aria-pressed={orderType === k.value}
                    className={cn(
                      "h-9 rounded-md border text-sm font-medium transition-colors",
                      orderType === k.value
                        ? "border-primary bg-primary-muted text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {ORDER_KINDS.find((k) => k.value === orderType)?.hint}
              </p>
            </div>

            {/* Entry + expiry only exist for the pending kinds */}
            {isPending && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nt-entry">Entry price</Label>
                  <Input
                    id="nt-entry"
                    type="number"
                    step="0.00001"
                    inputMode="decimal"
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                    placeholder="e.g. 1.08500"
                    className="tabular"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nt-expiry">Expires</Label>
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger id="nt-expiry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRIES.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="nt-lot">
                  Lot <span className="font-normal text-muted-foreground">— optional</span>
                </Label>
                <Input
                  id="nt-lot"
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  placeholder="Their sizing"
                  className="tabular"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt-sl">
                  Stop loss <span className="font-normal text-muted-foreground">— optional</span>
                </Label>
                <Input
                  id="nt-sl"
                  type="number"
                  step="0.00001"
                  inputMode="decimal"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  placeholder="e.g. 1.08200"
                  className="tabular"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt-tp">
                  Take profit <span className="font-normal text-muted-foreground">— optional</span>
                </Label>
                <Input
                  id="nt-tp"
                  type="number"
                  step="0.00001"
                  inputMode="decimal"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  placeholder="e.g. 1.09100"
                  className="tabular"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review — exactly what is about to be sent, in the executor's terms. */}
        <Card>
          <CardHeader className="border-b border-border px-5 py-3.5">
            <CardTitle>Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
              <Field label="Goes to" value={targetName} />
              <Field label="Order" value={pair ? `${orderTypeLabel(orderType, side)} ${pair}` : "—"} />
              <Field
                label="Entry"
                value={isPending ? (entry ? entry : "not set") : "at market"}
                muted={isPending && !entry}
              />
              <Field label="Lot" value={lot || "each trader's own"} muted={!lot} />
              <Field label="Stop" value={sl || "none"} muted={!sl} />
              <Field label="Target" value={tp || "none"} muted={!tp} />
              {isPending && (
                <Field
                  label="Expires"
                  value={EXPIRIES.find((e) => e.value === expiry)?.label ?? "—"}
                />
              )}
            </dl>

            {problems.length > 0 && (
              <ul className="space-y-1 border-t border-border pt-3">
                {problems.map((p) => (
                  <li key={p} className="text-xs text-short">
                    {p}
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant={side === "buy" ? "long" : "short"}
              size="lg"
              className="w-full"
              disabled={!canSend}
              onClick={handleSend}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Send ${orderTypeLabel(orderType, side)}${pair ? ` ${pair}` : ""}`
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <DispatchStatus
        activeTerminals={activeTerminals}
        clientsReached={clientsReached}
        lastSignalSent={lastSignalSent}
        hasSent={lastSignalIds.length > 0}
      />
    </div>
  );
}

/** Reads the way MetaCopier names it: Buy, SellLimit, BuyStop. */
function orderTypeLabel(kind: OrderKind, side: Side) {
  const word = side === "buy" ? "Buy" : "Sell";
  if (kind === "MARKET") return word;
  return `${word} ${kind === "LIMIT" ? "Limit" : "Stop"}`;
}

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <dt className="section-label">{label}</dt>
      <dd className={cn("tabular mt-0.5", muted && "text-muted-foreground")}>{value}</dd>
    </div>
  );
}
