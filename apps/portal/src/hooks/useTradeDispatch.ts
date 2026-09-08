import { useCallback, useEffect, useMemo, useState } from "react";
import { novaHost } from "@/integrations/novahost/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shared dispatch logic for the Quick Trade and Normal Trade screens.
 *
 * Both send the same kind of thing to the same place; they differ only in how
 * much of the ticket the mentor fills in. Keeping the fleet scoping and the
 * delivery counting here means a correctness fix lands on both screens at once
 * rather than one of them silently keeping the old behaviour.
 */

export type Side = "buy" | "sell";

/** Mirrors `toOrderType` in metacopier-execute, which rejects anything else. */
export type OrderKind = "MARKET" | "LIMIT" | "STOP";

export interface Product {
  id: string;
  name: string;
  /** Exactly what this mentor configured on the robot, in their own words. */
  symbols: string[];
}

export interface DispatchInput {
  pair: string;
  side: Side;
  /** Null means "each subscriber's own sizing plan decides", never 0. */
  lot: number | null;
  sl: number | null;
  tp: number | null;
  orderType: OrderKind;
  /** Required by the executor for LIMIT and STOP; ignored for MARKET. */
  entryPrice: number | null;
  expirySeconds: number | null;
}

export interface DispatchResult {
  ok: boolean;
  error?: string;
  botsTargeted?: number;
}

/**
 * The canonical name for an instrument: letters and digits, upper case.
 *
 * Matches `baseSymbol` in metacopier-execute, so a symbol that passes here is a
 * symbol the executor will recognise. `XAU/USD` and `xauusd` are the same
 * instrument; the broker's own spelling is resolved per-subscriber further down
 * the chain.
 */
export const canon = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export const ALL_ROBOTS = "ALL";

export function useTradeDispatch() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [targetId, setTargetId] = useState<string>(ALL_ROBOTS);
  const [activeTerminals, setActiveTerminals] = useState(0);
  const [clientsReached, setClientsReached] = useState(0);
  const [lastSignalSent, setLastSignalSent] = useState<Date | null>(null);
  const [isSending, setIsSending] = useState(false);
  /**
   * The signals the last send actually created, so delivery is counted against
   * them rather than guessed.
   */
  const [lastSignalIds, setLastSignalIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadProducts() {
      const { data } = await novaHost
        .from("expert_advisors")
        .select("id, name, symbols")
        .eq("user_id", user!.id)
        .order("name");

      if (cancelled || !data) return;
      setProducts(
        data.map((p) => ({
          id: p.id,
          name: p.name,
          symbols: Array.isArray(p.symbols) ? (p.symbols as string[]) : [],
        })),
      );
    }

    /**
     * Terminals running THIS mentor's robots. Not every terminal on the platform.
     *
     * This once counted `device_activations` unfiltered, so the panel showed
     * every handset belonging to every mentor. A broadcast that reached none of
     * your own subscribers still lit the panel and filled the delivery bar --
     * the portal reporting a successful send off a number that had nothing to do
     * with the send.
     *
     * `licenses` and `device_activations` are both readable by any signed-in
     * user, so the scoping has to be done here, explicitly, from the bots this
     * account actually owns.
     */
    async function fetchActiveTerminals() {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data: eas } = await novaHost
        .from("expert_advisors")
        .select("id")
        .eq("user_id", user!.id);

      const eaIds = (eas ?? []).map((e) => e.id);
      if (eaIds.length === 0) {
        if (!cancelled) setActiveTerminals(0);
        return;
      }

      const { data: licences } = await novaHost
        .from("licenses")
        .select("id")
        .in("ea_id", eaIds);

      const licenceIds = (licences ?? []).map((l) => l.id);
      if (licenceIds.length === 0) {
        if (!cancelled) setActiveTerminals(0);
        return;
      }

      const { count, error } = await novaHost
        .from("device_activations")
        .select("*", { count: "exact", head: true })
        .in("license_id", licenceIds)
        .gt("last_seen_at", fifteenMinutesAgo)
        .eq("status", "active");

      if (!cancelled && !error && count !== null) setActiveTerminals(count);
    }

    loadProducts();
    fetchActiveTerminals();
    const interval = setInterval(fetchActiveTerminals, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  /**
   * Counts the handsets that have actually picked the last signal up.
   *
   * This number used to be set to the heartbeat count at send time -- the send
   * assumed its own success and drew a full progress bar. It reported
   * "Synchronized" whether the fleet had executed the trade or never received
   * it, which is what let a dead pipeline look healthy for weeks.
   *
   * `signal_deliveries` records the moment a device claims a signal. Polled for
   * two minutes after a send: handsets poll on a ~20s cycle, so pickups trickle
   * in, and after two minutes anything missing is offline rather than slow.
   */
  useEffect(() => {
    if (lastSignalIds.length === 0) return;

    let cancelled = false;
    const startedAt = Date.now();

    async function countDeliveries() {
      const { data, error } = await novaHost
        .from("signal_deliveries")
        .select("license_id")
        .in("signal_id", lastSignalIds);

      if (cancelled || error) return;

      // Distinct licences: a signal fanned out to several robots produces one
      // row per (signal, licence), and one subscriber picking up two of them is
      // still one subscriber reached.
      setClientsReached(new Set((data ?? []).map((d) => d.license_id)).size);
    }

    countDeliveries();
    const interval = setInterval(() => {
      if (Date.now() - startedAt > 120_000) {
        clearInterval(interval);
        return;
      }
      countDeliveries();
    }, 3_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [lastSignalIds]);

  /**
   * The instruments a send can actually reach.
   *
   * Taken from the robots themselves, not a list in this file. The robot editor
   * lets a mentor type any symbol they want -- that is the point of it -- and
   * the dispatch screen used to hold a fixed eleven and reject everything else.
   * The allowance and the send have to be the same list or the allowance is
   * decoration.
   *
   * Targeting one robot narrows to that robot. Targeting all offers the union,
   * because a signal on a symbol only some robots carry is still a valid send:
   * `broadcast-signal` fans out per robot and the licence check drops it for the
   * ones that do not permit it.
   */
  const availablePairs = useMemo(() => {
    const source =
      targetId === ALL_ROBOTS
        ? products.flatMap((p) => p.symbols)
        : products.find((p) => p.id === targetId)?.symbols ?? [];

    return Array.from(new Set(source.map(canon).filter(Boolean))).sort();
  }, [products, targetId]);

  const targetName = useMemo(() => {
    if (targetId === ALL_ROBOTS) return "all your robots";
    return products.find((p) => p.id === targetId)?.name ?? "the selected robot";
  }, [products, targetId]);

  const send = useCallback(
    async (input: DispatchInput): Promise<DispatchResult> => {
      if (!user) return { ok: false, error: "You must be signed in." };

      setIsSending(true);
      try {
        // Null, not zero, for anything left blank. Zero is a value the executor
        // would act on; null is the absence the subscriber's own plan fills in.
        const payload = {
          ea_id: targetId === ALL_ROBOTS ? "MASTER_OVERRIDE" : targetId,
          pair: input.pair,
          side: input.side.toUpperCase(),
          type: input.side.toUpperCase(),
          lot: input.lot,
          sl: input.sl,
          tp: input.tp,
          // Only meaningful for the pending kinds; broadcast-signal drops the
          // price when the order is a market order rather than storing a stale
          // level the executor would have to ignore.
          order_type: input.orderType,
          price: input.orderType === "MARKET" ? null : input.entryPrice,
          pending_expiry_seconds: input.orderType === "MARKET" ? null : input.expirySeconds,
        };

        const { data, error } = await novaHost.functions.invoke("broadcast-signal", {
          body: payload,
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setLastSignalSent(new Date());
        // Reset and let the delivery poll fill it in, rather than drawing a full
        // bar before a single handset has seen the signal.
        setClientsReached(0);
        setLastSignalIds(Array.isArray(data?.signalIds) ? data.signalIds : []);

        return { ok: true, botsTargeted: data?.botsTargeted };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not route dispatch";
        console.error("Broadcast failed:", e);
        return { ok: false, error: message };
      } finally {
        setIsSending(false);
      }
    },
    [targetId, user],
  );

  return {
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
  };
}
