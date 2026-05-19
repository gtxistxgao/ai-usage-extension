/**
 * Single source of truth for keys and identifiers shared across every
 * extension context (background, content script, sidepanel/popup, welcome).
 */

export const STORAGE_KEYS = {
  /** Persisted `UsageState` snapshot. */
  usageState: 'ai_usage_state',
  /** Cached Claude organization id used to build the usage endpoint. */
  claudeOrgId: 'claude_org_id',
  /** Whether the on-page overlay is shown on claude.ai. */
  claudeOverlayEnabled: 'claude_overlay_enabled',
  /** Whether the on-page overlay is collapsed into its side tab. */
  claudeOverlayCollapsed: 'claude_overlay_collapsed',
} as const;

/** Name of the recurring alarm that refreshes usage in the background. */
export const REFRESH_ALARM = 'refreshUsage';

/** How often the background worker re-fetches usage, in minutes. */
export const REFRESH_INTERVAL_MINUTES = 5;

/** Percentage thresholds that drive the ok / warning / critical tone. */
export const USAGE_THRESHOLDS = {
  warning: 70,
  critical: 90,
} as const;
