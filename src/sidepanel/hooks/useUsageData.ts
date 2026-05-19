import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../../shared/constants';
import { readUsageState, requestUsageRefresh } from '../../shared/messaging';
import type { UsageState } from '../../shared/types';

export interface UsageData {
  /** Latest usage snapshot, kept in sync with `chrome.storage`. */
  usage: UsageState;
  /** Whether the on-page Claude overlay is enabled. */
  overlayEnabled: boolean;
  /** True until the first snapshot has been read from storage. */
  loading: boolean;
  /** True while a manual refresh round-trip is in flight. */
  refreshing: boolean;
  /** Human-readable error from the last refresh attempt, if any. */
  error: string | null;
  /** Trigger a background refresh of every provider. */
  refresh: () => Promise<void>;
  /** Toggle the on-page Claude overlay. */
  setOverlayEnabled: (enabled: boolean) => void;
}

/**
 * Owns all sidepanel data: the usage snapshot, the overlay preference,
 * and the loading / refreshing / error lifecycle. The snapshot stays live
 * by subscribing to `chrome.storage` changes from the background worker.
 */
export const useUsageData = (): UsageData => {
  const [usage, setUsage] = useState<UsageState>({});
  const [overlayEnabled, setOverlayState] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const hydrate = async (): Promise<void> => {
      const [state, settings] = await Promise.all([
        readUsageState(),
        chrome.storage.local.get(STORAGE_KEYS.claudeOverlayEnabled),
      ]);

      if (!active) {
        return;
      }

      setUsage(state);
      setOverlayState(settings[STORAGE_KEYS.claudeOverlayEnabled] !== false);
      setLoading(false);
    };

    void hydrate();

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ): void => {
      if (areaName !== 'local') {
        return;
      }

      if (changes[STORAGE_KEYS.usageState]) {
        setUsage((changes[STORAGE_KEYS.usageState].newValue ?? {}) as UsageState);
      }

      if (changes[STORAGE_KEYS.claudeOverlayEnabled]) {
        setOverlayState(changes[STORAGE_KEYS.claudeOverlayEnabled].newValue !== false);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    setError(null);
    try {
      setUsage(await requestUsageRefresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const setOverlayEnabled = useCallback((enabled: boolean): void => {
    setOverlayState(enabled);
    void chrome.storage.local.set({ [STORAGE_KEYS.claudeOverlayEnabled]: enabled });
  }, []);

  return { usage, overlayEnabled, loading, refreshing, error, refresh, setOverlayEnabled };
};
