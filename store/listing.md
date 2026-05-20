# Chrome Web Store Listing

This file is the canonical source for the Chrome Web Store listing.
Everything below is uploaded to the Web Store dashboard as-is.

> The `store:check` tests in `tests/store.test.js` enforce that every
> section below stays present and within Chrome's character limits.
> Do not rename headings — the tests grep them by exact text.

## Name

AI Usage Tracker — Claude & Codex Limits

## Short Description

Track Claude and Codex session and weekly usage limits at a glance — in your toolbar, in a popup, and right on the page.

## Full Description

AI Usage Tracker is a free, privacy-first Chrome extension that surfaces your
Claude and Codex (ChatGPT) usage limits without ever leaving the tab you're
working in. It reads the rate-limit data straight from your own authenticated
sessions — there is no external server, no account to create, and no telemetry.

### What you see

- A live toolbar badge that turns from purple to pink as you approach your cap.
- A popup with the 5-hour session window and the 7-day weekly window for each
  provider, including time-to-reset countdowns.
- An on-page overlay next to the chat input on claude.ai and chatgpt.com so you
  can pace yourself without opening the popup.

### Who it's for

- Engineers running long Claude Code or Codex sessions who need to know how
  much budget they have left before the next reset.
- ChatGPT Plus and Pro subscribers who want a clear read on their weekly cap.
- Anyone tired of hitting "you've reached your limit" with no warning.

### How it works

Every five minutes the extension's background worker re-reads the same usage
endpoints the official web apps already call when you're signed in. The data
is cached in `chrome.storage.local` and rendered by a small React UI. Nothing
is sent outside your browser.

### Privacy

- No analytics, no tracking, no remote configuration.
- No accounts, no sign-up, no email collection.
- All data stays in `chrome.storage.local` on this device.
- Open source — see the linked repository for the full code.

## Category

Productivity

## Language

English

## Keywords

claude usage, claude limits, claude rate limit tracker, codex usage, chatgpt
limits, chatgpt rate limit, ai usage tracker, claude session reset, claude
weekly limit, codex weekly cap, anthropic usage monitor, openai usage monitor,
claude pro tracker, chatgpt plus tracker, claude code usage

## Single Purpose

Display the current session and weekly usage limits for the signed-in user's
Claude (claude.ai) and Codex (chatgpt.com) accounts, both in the extension UI
and as an overlay on the provider pages.

## Justification Summary

This extension calls only the rate-limit endpoints of the user's already
signed-in Claude and Codex accounts, caches the result in `chrome.storage.local`,
and renders it in the popup, on-page overlay, and toolbar badge. Each requested
permission maps to one of those tasks; the full rationale is documented in
[permissions.md](./permissions.md).
