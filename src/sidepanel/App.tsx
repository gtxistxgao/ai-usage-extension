import claudeBrandAsset from '../assets/brands/claude-anthropic.jpg';
import codexBrandAsset from '../assets/brands/codex-openai.jpg';
import { ProviderCard } from './components/ProviderCard';
import { useNow } from '../shared/hooks/useNow';
import { useUsageData } from './hooks/useUsageData';
import './styles/global.css';

export const App = () => {
  const { usage, overlayEnabled, loading, refreshing, error, refresh, setOverlayEnabled } =
    useUsageData();
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

      <section className="au-toggle">
        <div className="au-toggle__text">
          <p className="au-toggle__label">Claude overlay</p>
          <p className="au-toggle__hint">On-page capsule in claude.ai</p>
        </div>
        <label className="au-switch" aria-label="Toggle Claude overlay">
          <input
            type="checkbox"
            checked={overlayEnabled}
            onChange={(event) => setOverlayEnabled(event.target.checked)}
          />
          <span className="au-switch__slider" />
        </label>
      </section>

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
    </main>
  );
};
