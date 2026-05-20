import { REFRESH_ALARM, REFRESH_INTERVAL_MINUTES } from '../shared/constants';
import type { ExtensionMessage, RefreshUsageResponse, UsageState } from '../shared/types';
import { getUsageTone } from '../shared/utils';
import { UsageService } from './services/UsageService';

const BADGE_COLORS: Record<ReturnType<typeof getUsageTone>, string> = {
  ok: '#4b8af5',
  warning: '#e69138',
  critical: '#e0533f',
};

let cachedLogoBitmap: ImageBitmap | null = null;

const getLogoBitmap = async (): Promise<ImageBitmap | null> => {
  if (cachedLogoBitmap) {
    return cachedLogoBitmap;
  }
  try {
    const response = await fetch(chrome.runtime.getURL('icons/icon-128.png'));
    const blob = await response.blob();
    cachedLogoBitmap = await createImageBitmap(blob);
    return cachedLogoBitmap;
  } catch {
    return null;
  }
};

const updateIcon = async (state: UsageState): Promise<void> => {
  const hasClaude = Boolean(state.claude);
  const hasCodex = Boolean(state.codex);

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

  void chrome.action.setBadgeText({ text: '' });

  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, 32, 32);

  const logoBitmap = await getLogoBitmap();
  if (logoBitmap) {
    ctx.drawImage(logoBitmap, 0, 0, 32, 32);
  }

  const trackColor = 'rgba(128, 128, 128, 0.3)';

  const claudeSession = state.claude?.session.percentage ?? 0;
  const claudeTone = getUsageTone(claudeSession);
  const claudeColor = BADGE_COLORS[claudeTone];
  const claudeHeight = Math.round(24 * (claudeSession / 100));

  ctx.fillStyle = trackColor;
  ctx.beginPath();
  ctx.roundRect(2, 4, 3, 24, 1);
  ctx.fill();

  if (hasClaude && claudeHeight > 0) {
    ctx.fillStyle = claudeColor;
    ctx.beginPath();
    ctx.roundRect(2, 28 - claudeHeight, 3, claudeHeight, 1);
    ctx.fill();
  }

  const codexSession = state.codex?.session.percentage ?? 0;
  const codexTone = getUsageTone(codexSession);
  const codexColor = BADGE_COLORS[codexTone];
  const codexHeight = Math.round(24 * (codexSession / 100));

  ctx.fillStyle = trackColor;
  ctx.beginPath();
  ctx.roundRect(27, 4, 3, 24, 1);
  ctx.fill();

  if (hasCodex && codexHeight > 0) {
    ctx.fillStyle = codexColor;
    ctx.beginPath();
    ctx.roundRect(27, 28 - codexHeight, 3, codexHeight, 1);
    ctx.fill();
  }

  const imageData = ctx.getImageData(0, 0, 32, 32);
  void chrome.action.setIcon({ imageData: { '32': imageData } });
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
