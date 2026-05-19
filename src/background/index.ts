import { ExtensionMessage } from '@shared/types';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender,
  sendResponse
) => {
  console.log('Message received in background:', message);

  if (message.type === 'PING') {
    sendResponse({ success: true, data: 'PONG' });
  }

  return true;
});
