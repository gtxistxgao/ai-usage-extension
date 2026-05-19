import React, { useEffect, useMemo, useState } from 'react';
import { UsageService } from './services/UsageService';
import { UsageLimit, UsageState } from '../shared/types';
import { UsageCard } from './components/UsageCard';
import { ProgressBar } from './components/ProgressBar';
import { clampPercent, getUsageTone, UsageTone } from '../shared/utils';
import claudeBrandAsset from '../assets/brands/claude-anthropic.jpg';
import codexBrandAsset from '../assets/brands/codex-openai.jpg';
import './styles/global.css';

const CLAUDE_OVERLAY_ENABLED_KEY = 'claude_overlay_enabled';

const formatReset = (resetAt: string | null, now: number): string => {
  if (!resetAt) {
    return 'unknown';
  }

  const diff = new Date(resetAt).getTime() - now;
  if (diff <= 0) {
    return 'now';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
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

const renderMeta = (label: string, limit: UsageLimit, now: number): React.ReactNode => {
  if (typeof limit.used !== 'number' || typeof limit.limit !== 'number') {
    return (
      <p className="au-meta">
        {label}: reset <span>{formatReset(limit.resetsAt, now)}</span>
      </p>
    );
  }

  return (
    <p className="au-meta">
      {label}: <span>{limit.used}</span> / {limit.limit} · reset <span>{formatReset(limit.resetsAt, now)}</span>
    </p>
  );
};

const peakForService = (input?: { session: UsageLimit; weekly: UsageLimit } | null): number => {
  if (!input) {
    return 0;
  }

  return clampPercent(Math.max(input.session.percentage, input.weekly.percentage));
};

const nearestResetLabel = (state: UsageState, now: number): string => {
  const candidates = [
    state.claude?.session.resetsAt,
    state.claude?.weekly.resetsAt,
    state.codex?.session.resetsAt,
    state.codex?.weekly.resetsAt,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value) && value > now)
    .sort((a, b) => a - b);

  if (candidates.length === 0) {
    return 'no scheduled reset yet';
  }

  return formatReset(new Date(candidates[0]).toISOString(), now);
};

const toneLabel: Record<UsageTone, string> = {
  ok: 'Stable',
  warning: 'Watch',
  critical: 'At risk',
};

const nextResetForService = (input: UsageLimit[] | undefined, now: number): string => {
  if (!input || input.length === 0) {
    return 'no reset';
  }

  const next = input
    .map((item) => item.resetsAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value) && value > now)
    .sort((a, b) => a - b)[0];

  if (!next) {
    return 'no reset';
  }

  return formatReset(new Date(next).toISOString(), now);
};

export const App = () => {
  const [usage, setUsage] = useState<UsageState>({});
  const [loading, setLoading] = useState(true);
  const [claudeOverlayEnabled, setClaudeOverlayEnabled] = useState(true);
  const [showClaudeDetails, setShowClaudeDetails] = useState(false);
  const [showCodexDetails, setShowCodexDetails] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loadUsage = async () => {
    const [state, settings] = await Promise.all([
      UsageService.getUsageState(),
      chrome.storage.local.get(CLAUDE_OVERLAY_ENABLED_KEY),
    ]);

    setUsage(state);
    setClaudeOverlayEnabled(settings[CLAUDE_OVERLAY_ENABLED_KEY] !== false);
    setLoading(false);
  };

  const refreshUsage = async () => {
    setLoading(true);
    try {
      await UsageService.refreshUsage();
      await loadUsage();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsage();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.ai_usage_state?.newValue) {
        setUsage(changes.ai_usage_state.newValue as UsageState);
      }

      if (changes[CLAUDE_OVERLAY_ENABLED_KEY]) {
        setClaudeOverlayEnabled(changes[CLAUDE_OVERLAY_ENABLED_KEY].newValue !== false);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleClaudeOverlay = async (enabled: boolean) => {
    setClaudeOverlayEnabled(enabled);
    await chrome.storage.local.set({ [CLAUDE_OVERLAY_ENABLED_KEY]: enabled });
  };

  const isInitialLoading = loading && !usage.claude && !usage.codex;

  const claudePeak = useMemo(() => peakForService(usage.claude), [usage.claude]);
  const codexPeak = useMemo(() => peakForService(usage.codex), [usage.codex]);
  const globalPeak = Math.max(claudePeak, codexPeak);
  const globalTone = getUsageTone(globalPeak);
  const claudeNextReset = usage.claude ? nextResetForService([usage.claude.session, usage.claude.weekly], now) : 'no data';
  const codexNextReset = usage.codex ? nextResetForService([usage.codex.session, usage.codex.weekly], now) : 'no data';

  return (
    <main className="au-shell">
      <header className="au-topbar">
        <div>
          <p className="au-eyebrow">AI Capacity</p>
          <h1 className="au-title">Usage Radar</h1>
          <p className="au-subtitle">Next reset in {nearestResetLabel(usage, now)}</p>
        </div>
        <button
          type="button"
          onClick={refreshUsage}
          disabled={loading}
          className={`au-refresh ${loading ? 'au-refresh--loading' : ''}`}
          title="Refresh"
        >
          refresh
        </button>
      </header>

      <section className={`au-hero au-hero--${globalTone}`}>
        <div className="au-hero__left">
          <p className="au-hero__label">Overall headroom</p>
          <p className="au-hero__value">{globalPeak}%</p>
        </div>
        <div className="au-hero__right">
          <span className={`au-badge au-badge--${globalTone}`}>{toneLabel[globalTone]}</span>
          <p className="au-hero__hint">Highest active window across Claude and Codex</p>
        </div>
      </section>

      <section className="au-pills">
        <div className={`au-pill ${usage.claude ? `au-pill--${getUsageTone(claudePeak)}` : 'au-pill--idle'}`}>
          <img className="au-pill__icon" src={claudeBrandAsset} alt="Claude by Anthropic" />
          <span className="au-pill__name">Claude</span>
          <span className="au-pill__value">{usage.claude ? `${claudePeak}%` : '—'}</span>
          <span className="au-pill__meta">reset {claudeNextReset}</span>
        </div>
        <div className={`au-pill ${usage.codex ? `au-pill--${getUsageTone(codexPeak)}` : 'au-pill--idle'}`}>
          <img className="au-pill__icon" src={codexBrandAsset} alt="OpenAI" />
          <span className="au-pill__name">Codex</span>
          <span className="au-pill__value">{usage.codex ? `${codexPeak}%` : '—'}</span>
          <span className="au-pill__meta">reset {codexNextReset}</span>
        </div>
      </section>

      <section className="au-toggle">
        <div className="au-toggle__text">
          <p className="au-toggle__label">Claude overlay</p>
          <p className="au-toggle__hint">On-page capsule in claude.ai</p>
        </div>
        <label className="au-switch" aria-label="Toggle Claude overlay">
          <input
            type="checkbox"
            checked={claudeOverlayEnabled}
            onChange={(event) => void toggleClaudeOverlay(event.target.checked)}
          />
          <span className="au-switch__slider" />
        </label>
      </section>

      <div className="au-cards">
        {isInitialLoading ? (
          <>
            <UsageCard title="Claude" subtitle="loading snapshot" iconSrc={claudeBrandAsset} iconAlt="Claude by Anthropic">
              <div className="au-loader" aria-hidden="true">
                <div className="au-loader__line au-loader__line--w80" />
                <div className="au-loader__bar" />
                <div className="au-loader__line au-loader__line--w60" />
              </div>
            </UsageCard>
            <UsageCard title="Codex" subtitle="loading snapshot" iconSrc={codexBrandAsset} iconAlt="OpenAI">
              <div className="au-loader" aria-hidden="true">
                <div className="au-loader__line au-loader__line--w80" />
                <div className="au-loader__bar" />
                <div className="au-loader__line au-loader__line--w60" />
              </div>
            </UsageCard>
          </>
        ) : (
          <>
            <UsageCard
              title="Claude"
              subtitle={usage.claude ? `updated ${formatUpdatedAgo(usage.claude.lastUpdated, now)}` : 'not connected'}
              tone={usage.claude?.status ?? 'ok'}
              iconSrc={claudeBrandAsset}
              iconAlt="Claude by Anthropic"
            >
              {usage.claude ? (
                <>
                  <ProgressBar label="Session (5h)" percentage={usage.claude.session.percentage} />
                  {renderMeta('Session', usage.claude.session, now)}
                  <ProgressBar label="Weekly (7d)" percentage={usage.claude.weekly.percentage} />
                  {renderMeta('Weekly', usage.claude.weekly, now)}
                  <p className="au-footnote">plan {usage.claude.plan}</p>
                  <button
                    type="button"
                    className="au-details-toggle"
                    onClick={() => setShowClaudeDetails((prev) => !prev)}
                  >
                    {showClaudeDetails ? 'Hide details' : 'Details'}
                  </button>
                  {showClaudeDetails && (
                    <pre className="au-json">{JSON.stringify(usage.claude.raw ?? { message: 'No raw payload yet' }, null, 2)}</pre>
                  )}
                </>
              ) : (
                <p className="au-empty">No data yet. Open claude.ai and click refresh.</p>
              )}
            </UsageCard>

            <UsageCard
              title="Codex"
              subtitle={usage.codex ? `updated ${formatUpdatedAgo(usage.codex.lastUpdated, now)}` : 'not connected'}
              tone={usage.codex?.status ?? 'ok'}
              iconSrc={codexBrandAsset}
              iconAlt="OpenAI"
            >
              {usage.codex ? (
                <>
                  <ProgressBar label="Session (5h)" percentage={usage.codex.session.percentage} />
                  {renderMeta('Session', usage.codex.session, now)}
                  <ProgressBar label="Weekly (7d)" percentage={usage.codex.weekly.percentage} />
                  {renderMeta('Weekly', usage.codex.weekly, now)}
                  <button
                    type="button"
                    className="au-details-toggle"
                    onClick={() => setShowCodexDetails((prev) => !prev)}
                  >
                    {showCodexDetails ? 'Hide details' : 'Details'}
                  </button>
                  {showCodexDetails && (
                    <pre className="au-json">{JSON.stringify(usage.codex.raw ?? { message: 'No raw payload yet' }, null, 2)}</pre>
                  )}
                </>
              ) : (
                <p className="au-empty">No data yet. Open chatgpt.com and click refresh.</p>
              )}
            </UsageCard>
          </>
        )}
      </div>
    </main>
  );
};
