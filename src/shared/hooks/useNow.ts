import { useEffect, useState } from 'react';

/**
 * A timestamp that re-renders the component on a fixed interval.
 * Used to keep relative time labels ("5m ago", "resets in 2h") fresh.
 */
export const useNow = (intervalMs: number): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
};
