import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import root from 'react-shadow';
import { ClaudeUsage, UsageState } from '../shared/types';
import { clampPercent, getUsageTone, UsageTone } from '../shared/utils';
import overlayCssUrl from './styles/overlay.css?url';
import claudeBrandAsset from '../assets/brands/claude-anthropic.jpg';

const STORAGE_KEY = 'ai_usage_state';
const OVERLAY_ENABLED_KEY = 'claude_overlay_enabled';
const HOST_ID = 'ai-usage-claude-overlay-host';


const formatReset = (resetAt: string | null, now: number): string => {
  if (!resetAt) {
    return 'Reset: unknown';
  }

  const diff = new Date(resetAt).getTime() - now;
  if (diff <= 0) {
    return 'Reset: now';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Reset: ${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `Reset: ${hours}h ${minutes}m`;
  }

  return `Reset: ${minutes}m`;
};

const formatUsageCount = (used?: number, limit?: number): string => {
  if (typeof used === 'number' && typeof limit === 'number') {
    return `${used} / ${limit}`;
  }

  return 'Usage %';
};

const formatUpdatedAgo = (updatedAt: number, now: number): string => {
  const diff = Math.max(0, now - updatedAt);
  const mins = Math.floor(diff / 60_000);

  if (mins < 1) {
    return 'just now';
  }

  if (mins < 60) {
    return `${mins}m ago`;
  }

  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
};

const toneLabel: Record<UsageTone, string> = {
  ok: 'Stable',
  warning: 'Watch',
  critical: 'At risk',
};

const toneClass = (percent: number): string => `aiu-meter--${getUsageTone(percent)}`;

const nextResetForOverlay = (usage: ClaudeUsage | null, now: number): string => {
  if (!usage) {
    return 'unknown';
  }

  const next = [usage.session.resetsAt, usage.weekly.resetsAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value) && value > now)
    .sort((a, b) => a - b)[0];

  if (!next) {
    return 'unknown';
  }

  return formatReset(new Date(next).toISOString(), now);
};

const UsageOverlay: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [usage, setUsage] = useState<ClaudeUsage | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = async (): Promise<void> => {
      const snapshot = await chrome.storage.local.get([STORAGE_KEY, OVERLAY_ENABLED_KEY]);
      const usageState = (snapshot[STORAGE_KEY] || {}) as UsageState;
      setUsage(usageState.claude ?? null);
      setEnabled(snapshot[OVERLAY_ENABLED_KEY] !== false);
      setIsLoading(false);
    };

    void load();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'local') {
        return;
      }

      if (changes[STORAGE_KEY]) {
        const nextState = (changes[STORAGE_KEY].newValue || {}) as UsageState;
        setUsage(nextState.claude ?? null);
      }

      if (changes[OVERLAY_ENABLED_KEY]) {
        setEnabled(changes[OVERLAY_ENABLED_KEY].newValue !== false);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const runRefresh = async (): Promise<void> => {
      setIsRefreshing(true);
      try {
        await chrome.runtime.sendMessage({ type: 'REFRESH_USAGE' });
      } catch {
        // ignore refresh errors in overlay
      } finally {
        setIsRefreshing(false);
      }
    };

    void runRefresh();
  }, []);

  const sessionPercent = useMemo(() => clampPercent(usage?.session.percentage ?? 0), [usage]);
  const weeklyPercent = useMemo(() => clampPercent(usage?.weekly.percentage ?? 0), [usage]);
  const tone: UsageTone = usage?.status ?? getUsageTone(Math.max(sessionPercent, weeklyPercent));

  if (!enabled) {
    return null;
  }

  return (
    <root.div className="aiu-root">
      <link rel="stylesheet" href={overlayCssUrl} />
      <div className={`aiu-wrap ${collapsed ? 'aiu-wrap--collapsed' : ''}`}>
        <button
          type="button"
          className="aiu-tab"
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? 'Show limits' : 'Hide limits'}
          aria-label={collapsed ? 'Show Claude limits' : 'Hide Claude limits'}
        >
          <img className="aiu-tab-icon" src={claudeBrandAsset} alt="Claude by Anthropic" />
          <span className="aiu-tab-label">Claude</span>
        </button>

        <div className={`aiu-card aiu-card--${tone}`}>
          <div className="aiu-header">
            <div>
              <div className="aiu-title-row">
                <img className="aiu-brand" src={claudeBrandAsset} alt="Claude by Anthropic" />
                <p className="aiu-title">Claude Limits</p>
              </div>
              <p className="aiu-subtitle">
                {usage
                  ? `updated ${formatUpdatedAgo(usage.lastUpdated, now)} · reset ${nextResetForOverlay(usage, now)}`
                  : 'waiting for snapshot'}
              </p>
            </div>
            <span className={`aiu-badge aiu-badge--${tone}`}>{toneLabel[tone]}</span>
          </div>

          {usage ? (
            <>
              <div className="aiu-group">
                <div className="aiu-row">
                  <span className="aiu-label">Session (5h)</span>
                  <span className="aiu-value">{sessionPercent}%</span>
                </div>
                <progress className={`aiu-meter ${toneClass(sessionPercent)}`} value={sessionPercent} max={100} />
                <div className="aiu-meta">
                  {formatUsageCount(usage.session.used, usage.session.limit)} · {formatReset(usage.session.resetsAt, now)}
                </div>
              </div>

              <div className="aiu-group">
                <div className="aiu-row">
                  <span className="aiu-label">Weekly (7d)</span>
                  <span className="aiu-value">{weeklyPercent}%</span>
                </div>
                <progress className={`aiu-meter ${toneClass(weeklyPercent)}`} value={weeklyPercent} max={100} />
                <div className="aiu-meta">
                  {formatUsageCount(usage.weekly.used, usage.weekly.limit)} · {formatReset(usage.weekly.resetsAt, now)}
                </div>
              </div>

              <div className="aiu-actions">
                <button type="button" className="aiu-details-toggle" onClick={() => setShowDetails((prev) => !prev)}>
                  {showDetails ? 'Hide details' : 'Details'}
                </button>
                {isRefreshing && <span className="aiu-refreshing">refreshing…</span>}
              </div>
              {showDetails && (
                <pre className="aiu-json">{JSON.stringify(usage.raw ?? { message: 'No raw payload yet' }, null, 2)}</pre>
              )}
            </>
          ) : isLoading || isRefreshing ? (
            <div className="aiu-loader" aria-hidden="true">
              <div className="aiu-loader__line aiu-loader__line--w80" />
              <div className="aiu-loader__bar" />
              <div className="aiu-loader__line aiu-loader__line--w60" />
            </div>
          ) : (
            <div className="aiu-empty">No data yet. Refresh in popup.</div>
          )}
        </div>
      </div>
    </root.div>
  );
};

const mount = (): void => {
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);

  createRoot(host).render(<UsageOverlay />);
};

mount();
