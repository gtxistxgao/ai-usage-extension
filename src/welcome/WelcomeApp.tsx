export default function WelcomeApp() {
  return (
    <main className="w-shell">
      <article className="w-card">
        <h1 className="w-title">AI Usage Tracker</h1>
        <p className="w-lede">
          Your rate limits for Claude and Codex are now visible right on the page and in the extension popup. Pin the extension to your toolbar for easy access.
        </p>
        <button type="button" className="w-cta" onClick={() => window.close()}>
          Got it
        </button>
      </article>
    </main>
  );
}
