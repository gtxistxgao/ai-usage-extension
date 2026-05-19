import { STORAGE_KEYS } from './constants';
import type { ExtensionMessage, RefreshUsageResponse, UsageState } from './types';

/**
 * Read the last persisted usage snapshot from `chrome.storage.local`.
 * Safe to call from any extension context.
 */
export const readUsageState = async (): Promise<UsageState> => {
  const data = await chrome.storage.local.get(STORAGE_KEYS.usageState);
  return (data[STORAGE_KEYS.usageState] ?? {}) as UsageState;
};

/**
 * Ask the background worker to fetch fresh usage for every provider.
 * Resolves with the new snapshot or throws with a descriptive error.
 */
export const requestUsageRefresh = async (): Promise<UsageState> => {
  const message: ExtensionMessage = { type: 'REFRESH_USAGE' };
  const response = (await chrome.runtime.sendMessage(message)) as RefreshUsageResponse | undefined;

  if (!response) {
    throw new Error('No response from the background worker');
  }

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};
