import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import root from 'react-shadow';
import claudeBrandAsset from '../assets/brands/claude-anthropic.jpg?inline';
import { STORAGE_KEYS } from '../shared/constants';
import { useNow } from '../shared/hooks/useNow';
import { requestUsageRefresh } from '../shared/messaging';
import type { ClaudeUsage, UsageLimit, UsageState } from '../shared/types';
import { formatRelativeTime, formatReset, getUsageTone } from '../shared/utils';
import overlayStyles from './styles/overlay.css?inline';

const HOST_ID = 'ai-usage-claude-overlay-host';

/** Closest upcoming reset across both windows, as a countdown label. */
const nextReset = (usage: ClaudeUsage, now: number): string => {
  const upcoming = [usage.session.resetsAt, usage.weekly.resetsAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value) && value > now)
    .sort((a, b) => a - b)[0];

  return upcoming ? formatReset(new Date(upcoming).toISOString(), now) : 'unknown';
};

interface OverlayMetricProps {
  label: string;
  limit: UsageLimit;
  now: number;
}

const OverlayMetric: React.FC<OverlayMetricProps> = ({ label, limit, now }) => {
  const percent = useMemo(() => Math.round(limit.percentage), [limit.percentage]);
  const hasCount =
    typeof limit.used === 'number' && typeof limit.limit === 'number' && limit.limit > 0;

  return (
    <div className="aiu-group">
      <div className="aiu-row">
        <span className="aiu-label">{label}</span>
        <span className="aiu-value">{percent}%</span>
      </div>
      <div
        className={`aiu-meter aiu-meter--${getUsageTone(percent)}`}
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="aiu-meter__fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="aiu-meta">
        {hasCount && (
          <>
            <span>
              {limit.used} / {limit.limit}
            </span>
            {' · '}
          </>
        )}
        resets <span>{formatReset(limit.resetsAt, now)}</span>
      </div>
    </div>
  );
};

const UsageOverlay: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [usage, setUsage] = useState<ClaudeUsage | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const now = useNow(60_000);

  useEffect(() => {
    let active = true;

    const hydrate = async (): Promise<void> => {
      const snapshot = await chrome.storage.local.get([
        STORAGE_KEYS.usageState,
        STORAGE_KEYS.claudeOverlayEnabled,
        STORAGE_KEYS.claudeOverlayCollapsed,
      ]);

      if (!active) {
        return;
      }

      const usageState = (snapshot[STORAGE_KEYS.usageState] ?? {}) as UsageState;
      setUsage(usageState.claude ?? null);
      setEnabled(snapshot[STORAGE_KEYS.claudeOverlayEnabled] !== false);
      setCollapsed(snapshot[STORAGE_KEYS.claudeOverlayCollapsed] === true);
      setIsLoading(false);
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
        const next = (changes[STORAGE_KEYS.usageState].newValue ?? {}) as UsageState;
        setUsage(next.claude ?? null);
      }

      if (changes[STORAGE_KEYS.claudeOverlayEnabled]) {
        setEnabled(changes[STORAGE_KEYS.claudeOverlayEnabled].newValue !== false);
      }

      if (changes[STORAGE_KEYS.claudeOverlayCollapsed]) {
        setCollapsed(changes[STORAGE_KEYS.claudeOverlayCollapsed].newValue === true);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const runRefresh = async (): Promise<void> => {
      setIsRefreshing(true);
      try {
        await requestUsageRefresh();
      } catch {
        // The popup surfaces refresh errors; the overlay stays quiet.
      } finally {
        if (active) {
          setIsRefreshing(false);
        }
      }
    };

    void runRefresh();
    return () => {
      active = false;
    };
  }, []);

  const toggleCollapsed = useCallback((): void => {
    setCollapsed((prev) => {
      const next = !prev;
      void chrome.storage.local.set({ [STORAGE_KEYS.claudeOverlayCollapsed]: next });
      return next;
    });
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <root.div className="aiu-root">
      <style>{overlayStyles}</style>
      <div className={`aiu-wrap ${collapsed ? 'aiu-wrap--collapsed' : ''}`}>
        <button
          type="button"
          className="aiu-tab"
          onClick={toggleCollapsed}
          title={collapsed ? 'Show limits' : 'Hide limits'}
          aria-label={collapsed ? 'Show Claude limits' : 'Hide Claude limits'}
          aria-expanded={!collapsed}
        >
          <img className="aiu-tab-icon" src={claudeBrandAsset} alt="" />
          <span className="aiu-tab-label">Claude</span>
        </button>

        <div className="aiu-card">
          <div className="aiu-header">
            <img className="aiu-brand" src={claudeBrandAsset} alt="" />
            <div className="aiu-heading">
              <p className="aiu-title">Claude</p>
              <p className="aiu-subtitle">
                {isRefreshing
                  ? 'refreshing…'
                  : usage
                    ? `updated ${formatRelativeTime(usage.lastUpdated, now)} · resets ${nextReset(usage, now)}`
                    : 'waiting for snapshot'}
              </p>
            </div>
          </div>

          {usage ? (
            <>
              <OverlayMetric label="Session · 5h" limit={usage.session} now={now} />
              <OverlayMetric label="Weekly · 7d" limit={usage.weekly} now={now} />
            </>
          ) : isLoading || isRefreshing ? (
            <div className="aiu-loader" aria-hidden="true">
              <div className="aiu-loader__line aiu-loader__line--w80" />
              <div className="aiu-loader__bar" />
              <div className="aiu-loader__line aiu-loader__line--w60" />
            </div>
          ) : (
            <div className="aiu-empty">No data yet. Open the popup and refresh.</div>
          )}
        </div>
      </div>
    </root.div>
  );
};

const mount = (): void => {
  if (document.getElementById(HOST_ID)) {
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);

  createRoot(host).render(<UsageOverlay />);
};

mount();
