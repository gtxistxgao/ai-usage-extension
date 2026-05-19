import { UsageState } from '../../shared/types';

export class UsageService {
  private static readonly STORAGE_KEY = 'ai_usage_state';

  static async getUsageState(): Promise<UsageState> {
    const data = await chrome.storage.local.get(this.STORAGE_KEY);
    return (data[this.STORAGE_KEY] || {}) as UsageState;
  }

  static async refreshUsage(): Promise<UsageState> {
    const response = await chrome.runtime.sendMessage({ type: 'REFRESH_USAGE' });
    if (!response?.success) {
      throw new Error(response?.error || 'refresh_failed');
    }

    return this.getUsageState();
  }
}
