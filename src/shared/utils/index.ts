import { USAGE_THRESHOLDS } from '../constants';
import type { UsageStatus } from '../types';

/** @deprecated kept as an alias — prefer `UsageStatus` from shared/types. */
export type UsageTone = UsageStatus;

/** Round a number into the inclusive 0–100 range. */
export const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

/** Map a usage percentage to its severity tone. */
export const getUsageTone = (value: number): UsageStatus => {
  const percent = clampPercent(value);

  if (percent >= USAGE_THRESHOLDS.critical) {
    return 'critical';
  }

  if (percent >= USAGE_THRESHOLDS.warning) {
    return 'warning';
  }

  return 'ok';
};

/**
 * Human-readable countdown to a reset timestamp.
 * Returns e.g. `2h 13m`, `45m`, `now`, or `unknown`.
 */
export const formatReset = (resetAt: string | null, now: number): string => {
  if (!resetAt) {
    return 'unknown';
  }

  const diff = new Date(resetAt).getTime() - now;
  if (!Number.isFinite(diff)) {
    return 'unknown';
  }

  if (diff <= 0) {
    return 'now';
  }

  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

/**
 * Human-readable "time since" label for a past timestamp.
 * Returns e.g. `just now`, `5m ago`, `3h ago`.
 */
export const formatRelativeTime = (timestamp: number, now: number): string => {
  const minutes = Math.floor(Math.max(0, now - timestamp) / 60_000);

  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
};
