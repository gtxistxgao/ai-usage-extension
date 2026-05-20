import { REFRESH_ALARM, REFRESH_INTERVAL_MINUTES } from '../shared/constants';
import type { ExtensionMessage, RefreshUsageResponse, UsageState } from '../shared/types';
import { getUsageTone } from '../shared/utils';
import { UsageService } from './services/UsageService';

const BADGE_COLORS: Record<ReturnType<typeof getUsageTone>, string> = {
  ok: '#8752FA',
  warning: '#CD83FF',
  critical: '#ff3366',
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

  const cx = 16;
  const cy = 16;
  const radius = 14;
  const strokeWidth = 2.5;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, radius, (2 / 3) * Math.PI, (4 / 3) * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, -(1 / 3) * Math.PI, (1 / 3) * Math.PI);
  ctx.stroke();

  const claudeSession = state.claude?.session.percentage ?? 0;
  const claudeTone = getUsageTone(claudeSession);
  const claudeColor = BADGE_COLORS[claudeTone];

  if (hasClaude && claudeSession > 0) {
    ctx.strokeStyle = claudeColor;
    ctx.shadowColor = claudeColor;
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      radius,
      (2 / 3) * Math.PI,
      (2 / 3) * Math.PI + ((2 / 3) * Math.PI * claudeSession) / 100
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const codexSession = state.codex?.session.percentage ?? 0;
  const codexTone = getUsageTone(codexSession);
  const codexColor = BADGE_COLORS[codexTone];

  if (hasCodex && codexSession > 0) {
    ctx.strokeStyle = codexColor;
    ctx.shadowColor = codexColor;
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      radius,
      (1 / 3) * Math.PI,
      (1 / 3) * Math.PI - ((2 / 3) * Math.PI * codexSession) / 100,
      true
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
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
