import { REFRESH_ALARM, REFRESH_INTERVAL_MINUTES } from '../shared/constants';
import type { ExtensionMessage, RefreshUsageResponse, UsageState } from '../shared/types';
import { getUsageTone } from '../shared/utils';
import { UsageService } from './services/UsageService';

const BADGE_COLORS: Record<ReturnType<typeof getUsageTone>, string> = {
  ok: '#8752FA',
  warning: '#CD83FF',
  critical: '#ff3366',
};

const updateIcon = async (state: UsageState): Promise<void> => {
  const claudeSession = state.claude?.session.percentage;
  const codexSession = state.codex?.session.percentage;

  const hasClaude = typeof claudeSession === 'number';
  const hasCodex = typeof codexSession === 'number';

  if (!hasClaude && !hasCodex) {
    void chrome.action.setBadgeText({ text: '' });
    void chrome.action.setIcon({
      path: {
        '16': 'icons/icon-16.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png',
      },
    });
    return;
  }

  void chrome.action.setIcon({
    path: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  });

  const claudeStr = hasClaude ? Math.min(99, Math.round(claudeSession)).toString() : '--';
  const codexStr = hasCodex ? Math.min(99, Math.round(codexSession)).toString() : '--';
  const text = `${claudeStr}|${codexStr}`;

  void chrome.action.setBadgeText({ text });

  const tones: ReturnType<typeof getUsageTone>[] = [];
  if (hasClaude) {
    tones.push(getUsageTone(claudeSession));
  }
  if (hasCodex) {
    tones.push(getUsageTone(codexSession));
  }

  let highestTone: ReturnType<typeof getUsageTone> = 'ok';
  if (tones.includes('critical')) {
    highestTone = 'critical';
  } else if (tones.includes('warning')) {
    highestTone = 'warning';
  }

  void chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[highestTone] });
};

const refreshUsage = async (): Promise<UsageState> => {
  const state = await UsageService.refreshAllUsage();
  await updateIcon(state);
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
