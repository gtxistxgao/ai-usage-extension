import { UsageService } from './services/UsageService';

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refreshUsage', { periodInMinutes: 5 });
  UsageService.refreshAllUsage().catch(() => undefined);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshUsage') {
    UsageService.refreshAllUsage().catch(() => undefined);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'REFRESH_USAGE') {
    return;
  }

  UsageService.refreshAllUsage()
    .then((state) => {
      sendResponse({ success: true, data: state });
    })
    .catch((error: unknown) => {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'refresh_failed' });
    });

  return true;
});
