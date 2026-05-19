import { REFRESH_ALARM, REFRESH_INTERVAL_MINUTES } from '../shared/constants';
import type { ExtensionMessage, RefreshUsageResponse, UsageState } from '../shared/types';
import { getUsageTone } from '../shared/utils';
import { UsageService } from './services/UsageService';

const BADGE_COLORS: Record<ReturnType<typeof getUsageTone>, string> = {
  ok: '#4b8af5',
  warning: '#e69138',
  critical: '#e0533f',
};

/** Reflect the highest usage percentage on the toolbar icon badge. */
const updateBadge = (state: UsageState): void => {
  const percents: number[] = [];

  if (state.claude) {
    percents.push(state.claude.session.percentage, state.claude.weekly.percentage);
  }
  if (state.codex) {
    percents.push(state.codex.session.percentage, state.codex.weekly.percentage);
  }

  if (percents.length === 0) {
    void chrome.action.setBadgeText({ text: '' });
    return;
  }

  const peak = Math.round(Math.max(...percents));
  void chrome.action.setBadgeText({ text: String(peak) });
  void chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[getUsageTone(peak)] });
};

/** Refresh every provider and keep the badge in sync. */
const refreshUsage = async (): Promise<UsageState> => {
  const state = await UsageService.refreshAllUsage();
  updateBadge(state);
  return state;
};

chrome.runtime.onInstalled.addListener((details) => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_INTERVAL_MINUTES });
  void refreshUsage().catch(() => undefined);

  if (details.reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome.html') });
  }
});

chrome.runtime.onStartup.addListener(() => {
  void refreshUsage().catch(() => undefined);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) {
    void refreshUsage().catch(() => undefined);
  }
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (response: RefreshUsageResponse) => void) => {
    if (message?.type !== 'REFRESH_USAGE') {
      return undefined;
    }

    refreshUsage()
      .then((state) => sendResponse({ success: true, data: state }))
      .catch((error: unknown) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'refresh_failed',
        });
      });

    return true;
  },
);
