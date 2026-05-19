# AI Usage Tracker

A Chrome extension (Manifest V3) that tracks your **Claude** and **Codex** usage
limits — both the 5-hour session window and the 7-day weekly window — and surfaces
them in a popup, an on-page overlay, and the toolbar badge.

## Features

- **Live limits** for Claude and Codex: percentage used, raw counts, and time to reset.
- **Toolbar badge** showing your highest current usage at a glance.
- **On-page overlay** on `claude.ai` — a collapsible capsule rendered in a Shadow DOM,
  so it never clashes with the host page's styles.
- **Background refresh** every 5 minutes via `chrome.alarms`, plus on-demand refresh.
- **Private by design**: usage is read from your own authenticated sessions with
  Claude and OpenAI. No external servers, no accounts, no tracking.

## Architecture

The extension is split into isolated contexts that communicate through a typed
messaging layer:

```text
src/
  background/   # Service worker: scheduling, fetching, badge updates
    services/   # UsageService — fetches & parses provider APIs
  content/      # claude.ai overlay (React in Shadow DOM)
  sidepanel/    # Popup UI (React)
    components/ # Presentational components
    hooks/      # useUsageData — owns the popup's data lifecycle
  shared/       # Cross-context layer — no context-specific imports
    constants  # Storage keys, alarm name, thresholds
    hooks      # Framework hooks shared by popup & overlay (useNow)
    messaging  # Typed message helpers (readUsageState, requestUsageRefresh)
    types      # Domain & messaging types
    utils      # clampPercent, getUsageTone, formatReset, formatRelativeTime
```

**Data flow:** the background worker fetches usage, writes a `UsageState` snapshot to
`chrome.storage.local`, and updates the badge. The popup and overlay read that
snapshot and subscribe to `chrome.storage.onChanged`, so every surface stays in sync.

## Getting Started

### Install dependencies

```bash
npm install
```

### Develop

```bash
npm run dev
```

Builds to `dist/` and watches for changes.

### Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` directory.
4. Sign in to `claude.ai` and `chatgpt.com`, then open the popup and refresh.

## Scripts

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Build and watch for development.              |
| `npm run build`      | Type-check, then produce a production build.  |
| `npm run release`    | Build and package `dist/` into `release/*.zip`. |
| `npm run typecheck`  | Run `tsc` with no emit.                       |
| `npm run lint`       | Lint `src/` with ESLint.                      |
| `npm run format`     | Format `src/` with Prettier.                  |

## License

MIT
