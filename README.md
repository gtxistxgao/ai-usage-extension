# Chrome Extension Template (MV3 + React + Vite)

A professional, production-ready template for building complex Chrome extensions. It provides a robust architectural foundation with a focus on type safety, clear context separation, and efficient messaging.

## Architectural Foundation

This template follows a strict multi-context architecture to handle the complexities of Chrome Extension development:

- **Background (Service Worker)**: Orchestrates life-cycle events and long-running tasks.
- **Content Scripts**: Interacts with web pages, injects UI, and executes page-level logic.
- **Sidepanel**: A full-featured React application providing a persistent and rich user interface.
- **Shared Layer**: Centralized messaging protocols, types, and utilities that ensure consistency across all contexts.

## Directory Structure

```text
src/
  background/  # Service worker, event listeners, background logic
  content/     # DOM interaction, page-level scripts, UI overlays
  sidepanel/   # Main UI application (React)
    components/ # Reusable UI components
    hooks/      # State management and context-specific logic
    services/   # Business logic and API clients
  shared/      # Common types, messaging bridge, and global utilities
```

## Key Features

- **Vite & React**: Fast development with Hot Module Replacement (HMR) for the sidepanel.
- **TypeScript**: Strict typing across all extension contexts.
- **Messaging Bridge**: A structured way to send messages between Sidepanel, Background, and Content scripts.
- **Tailwind CSS**: Modern styling pre-configured.
- **Manifest V3**: Fully compliant with the latest Chrome extension standards.
- **Storage Sync**: Example implementation of persistent state management.

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Development

```bash
npm run dev
```
Builds the extension and watches for changes. The output is in the `dist/` folder.

### 3. Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist/` directory.

## Architecture Rules (ESLint Enforced)

- `shared`: Pure logic and types. No dependencies on other folders.
- `content`, `background`, `sidepanel`: Isolated contexts. Communication must happen through `shared/messaging`.

## Customization

1. **Branding**: Update `name` and `description` in `manifest.json`.
2. **Icons**: Replace files in `public/icons/`.
3. **UI**: Start building your features in `src/sidepanel/App.tsx`.
4. **Logic**: Add cross-context listeners in `src/background/index.ts` and `src/content/index.tsx`.

## License

MIT
