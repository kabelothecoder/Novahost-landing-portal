import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Load once, expose { data, error, loading, reload }.
 *
 * Deliberately not react-query: every page here loads one payload from one
 * function and reloads on demand. A cache layer would mostly add a way for the
 * console to show a stale revenue figure, which is the one thing it must never
 * do.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // A reload fired while one is in flight would otherwise let the slower
  // response overwrite the newer one.
  const runId = useRef(0);

  const run = useCallback(async () => {
    const id = ++runId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (id !== runId.current) return;
      setData(result);
    } catch (err) {
      if (id !== runId.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (id === runId.current) setLoading(false);
    }
    // `fn` is a fresh closure each render; the caller's deps say when it
    // actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, error, loading, reload: run };
}
