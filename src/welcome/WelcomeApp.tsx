import claudeBrandAsset from '../assets/brands/claude-anthropic.jpg';
import codexBrandAsset from '../assets/brands/codex-openai.jpg';

interface Step {
  index: number;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    index: 1,
    title: 'Pin the extension',
    body: 'Open the puzzle icon in Chrome’s toolbar and pin “AI Usage Tracker” for one-click access.',
  },
  {
    index: 2,
    title: 'Sign in to your AI tools',
    body: 'Open claude.ai and chatgpt.com while signed in. Usage is read from your own authenticated session — nothing else is required.',
  },
  {
    index: 3,
    title: 'Watch your limits',
    body: 'Click the icon for live session and weekly limits. The toolbar badge always shows your highest usage at a glance.',
  },
];

export default function WelcomeApp() {
  return (
    <main className="w-shell">
      <article className="w-card">
        <header className="w-hero">
          <span className="w-badge">Chrome Extension · Installed</span>
          <h1 className="w-title">AI Usage Tracker</h1>
          <p className="w-lede">
            Keep an eye on your Claude and Codex rate limits — both the 5-hour session and the 7-day
            window — without leaving the page you’re working on.
          </p>
          <div className="w-brands">
            <span className="w-brand">
              <img src={claudeBrandAsset} alt="" />
              Claude
            </span>
            <span className="w-brand">
              <img src={codexBrandAsset} alt="" />
              Codex
            </span>
          </div>
        </header>

        <ol className="w-steps">
          {STEPS.map((step) => (
            <li key={step.index} className="w-step">
              <span className="w-step__num">{step.index}</span>
              <div>
                <p className="w-step__title">{step.title}</p>
                <p className="w-step__body">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="w-note">
          <p className="w-note__title">On-page overlay</p>
          <p className="w-note__body">
            On claude.ai a compact capsule shows your limits right on the page. Toggle it anytime
            from the popup.
          </p>
        </section>

        <section className="w-note w-note--privacy">
          <p className="w-note__title">Private by design</p>
          <p className="w-note__body">
            Everything stays on your device. The extension talks only to Claude and OpenAI using
            your existing login — no external servers, no accounts, no tracking.
          </p>
        </section>

        <button type="button" className="w-cta" onClick={() => window.close()}>
          Got it — let’s go
        </button>
      </article>
    </main>
  );
}
