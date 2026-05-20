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

  const claudeOverlayToggle = (
    <div className="au-overlay">
      <div>
        <p className="au-overlay__label">Overlay on claude.ai</p>
        <p className="au-overlay__hint">Show the usage capsule on the page</p>
      </div>
      <label className="au-switch" aria-label="Toggle Claude overlay">
        <input
          type="checkbox"
          checked={claudeOverlayEnabled}
          onChange={(event) => setClaudeOverlayEnabled(event.target.checked)}
        />
        <span className="au-switch__slider" />
      </label>
    </div>
  );

  const codexOverlayToggle = (
    <div className="au-overlay">
      <div>
        <p className="au-overlay__label">Overlay on chatgpt.com</p>
        <p className="au-overlay__hint">Show the usage capsule on the page</p>
      </div>
      <label className="au-switch" aria-label="Toggle Codex overlay">
        <input
          type="checkbox"
          checked={codexOverlayEnabled}
          onChange={(event) => setCodexOverlayEnabled(event.target.checked)}
        />
        <span className="au-switch__slider" />
      </label>
    </div>
  );

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
          className={`au-refresh ${refreshing ? 'au-refresh--loading' : ''}`}
          title="Refresh usage"
        >
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </header>

      {error && (
        <p className="au-error" role="alert">
          Couldn’t refresh — {error}
        </p>
      )}

      <div className="au-cards">
        <ProviderCard
          title="Claude"
          iconSrc={claudeBrandAsset}
          iconAlt="Claude by Anthropic"
          usage={usage.claude}
          loading={initialLoading}
          now={now}
          emptyHint="No data yet. Open claude.ai while signed in, then refresh."
          footer={claudeOverlayToggle}
        />
        <ProviderCard
          title="Codex"
          iconSrc={codexBrandAsset}
          iconAlt="OpenAI"
          usage={usage.codex}
          loading={initialLoading}
          now={now}
          emptyHint="No data yet. Open chatgpt.com while signed in, then refresh."
          footer={codexOverlayToggle}
        />
      </div>
    </main>
  );
};
