import claudeBrandAsset from '../assets/brands/claude-anthropic.jpg';
import codexBrandAsset from '../assets/brands/codex-openai.jpg';
import { useNow } from '../shared/hooks/useNow';
import { ProviderCard } from './components/ProviderCard';
import { useUsageData } from './hooks/useUsageData';
import './styles/global.css';

export const App = () => {
  const {
    usage,
    claudeOverlayEnabled,
    codexOverlayEnabled,
    loading,
    refreshing,
    error,
    refresh,
    setClaudeOverlayEnabled,
    setCodexOverlayEnabled,
  } = useUsageData();
  const now = useNow(30_000);

  const initialLoading = loading && !usage.claude && !usage.codex;

  return (
    <main className="au-shell">
      <header className="au-topbar">
        <div>
          <p className="au-eyebrow">AI Capacity</p>
          <h1 className="au-title">Usage</h1>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className={`au-btn-refresh ${refreshing ? 'au-btn-refresh--spin' : ''}`}
          title="Refresh usage"
          aria-label="Refresh usage"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="au-icon-refresh"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <polyline points="21 3 21 8 16 8" />
          </svg>
        </button>
      </header>

      {error && (
        <p className="au-error" role="alert">
          Couldn’t refresh — {error}
        </p>
      )}

      <div className="au-global-controls">
        <div className="au-overlay-toggle">
          <p className="au-overlay-toggle__label">On-Page Overlays</p>
          <label className="au-switch" aria-label="Toggle on-page overlays">
            <input
              type="checkbox"
              checked={claudeOverlayEnabled || codexOverlayEnabled}
              onChange={(event) => {
                const checked = event.target.checked;
                setClaudeOverlayEnabled(checked);
                setCodexOverlayEnabled(checked);
              }}
            />
            <span className="au-switch__slider" />
          </label>
        </div>
      </div>

      <div className="au-cards">
        <ProviderCard
          title="Claude"
          iconSrc={claudeBrandAsset}
          iconAlt="Claude by Anthropic"
          usage={usage.claude}
          loading={initialLoading}
          now={now}
          emptyHint="No data yet. Open claude.ai while signed in, then refresh."
        />
        <ProviderCard
          title="Codex"
          iconSrc={codexBrandAsset}
          iconAlt="OpenAI"
          usage={usage.codex}
          loading={initialLoading}
          now={now}
          emptyHint="No data yet. Open chatgpt.com while signed in, then refresh."
        />
      </div>

      <footer className="au-footer">
        <a
          className="au-footer__link"
          href="https://github.com/cupcakedev/ai-usage-extension"
          target="_blank"
          rel="noreferrer"
        >
          Source code
        </a>
        <span aria-hidden="true">·</span>
        <span>GitHub</span>
      </footer>
    </main>
  );
};
