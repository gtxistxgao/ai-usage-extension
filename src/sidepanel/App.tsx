import React, { useEffect, useState } from 'react';
import { UsageService } from './services/UsageService';
import { UsageLimit, UsageState } from '../shared/types';
import { UsageCard } from './components/UsageCard';
import { ProgressBar } from './components/ProgressBar';
import './styles/global.css';

const formatReset = (resetAt: string | null): string => {
  if (!resetAt) {
    return '—';
  }

  const diff = new Date(resetAt).getTime() - Date.now();
  if (diff <= 0) {
    return 'Now';
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

const renderMeta = (label: string, limit: UsageLimit): React.ReactNode => {
  if (typeof limit.used !== 'number' || typeof limit.limit !== 'number') {
    return null;
  }

  return (
    <p className="text-xs text-neutral-500 mt-1">
      {label}: <b>{limit.used}</b> / {limit.limit} • reset in {formatReset(limit.resetsAt)}
    </p>
  );
};

export const App = () => {
  const [usage, setUsage] = useState<UsageState>({});
  const [loading, setLoading] = useState(true);

  const loadUsage = async () => {
    const state = await UsageService.getUsageState();
    setUsage(state);
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
    loadUsage();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.ai_usage_state?.newValue) {
        setUsage(changes.ai_usage_state.newValue as UsageState);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen bg-neutral-50 p-4">
      <header className="w-full max-w-md flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-neutral-900">AI Usage Tracker</h1>
        <button
          onClick={refreshUsage}
          disabled={loading}
          className={`p-2 rounded-full hover:bg-neutral-200 transition-colors ${loading ? 'animate-spin' : ''}`}
          title="Refresh"
        >
          🔄
        </button>
      </header>

      <div className="w-full max-w-md">
        <UsageCard title="Claude" icon="🤖">
          {usage.claude ? (
            <>
              <ProgressBar
                label="Session (5h)"
                percentage={usage.claude.session.percentage}
                color={usage.claude.session.percentage > 80 ? 'bg-red-500' : 'bg-orange-500'}
              />
              {renderMeta('Session', usage.claude.session)}
              <ProgressBar
                label="Weekly (7d)"
                percentage={usage.claude.weekly.percentage}
                color={usage.claude.weekly.percentage > 80 ? 'bg-red-500' : 'bg-blue-600'}
              />
              {renderMeta('Weekly', usage.claude.weekly)}
              <p className="text-xs text-neutral-400 mt-2">
                Plan: {usage.claude.plan} • Updated: {new Date(usage.claude.lastUpdated).toLocaleTimeString()}
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-500">No data. Open claude.ai and press refresh.</p>
          )}
        </UsageCard>

        <UsageCard title="Codex" icon="💻">
          {usage.codex ? (
            <>
              <ProgressBar
                label="Session (5h)"
                percentage={usage.codex.session.percentage}
                color={usage.codex.session.percentage > 80 ? 'bg-red-500' : 'bg-purple-600'}
              />
              {renderMeta('Session', usage.codex.session)}
              <ProgressBar
                label="Weekly (7d)"
                percentage={usage.codex.weekly.percentage}
                color={usage.codex.weekly.percentage > 80 ? 'bg-red-500' : 'bg-indigo-600'}
              />
              {renderMeta('Weekly', usage.codex.weekly)}
            </>
          ) : (
            <p className="text-sm text-neutral-500">No data. Use Codex and refresh.</p>
          )}
        </UsageCard>

      </div>

      <footer className="mt-auto py-4 text-xs text-neutral-400">AI Usage Extension • 100% Local</footer>
    </div>
  );
};
