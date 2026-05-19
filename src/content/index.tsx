import { ExtensionMessage } from '@shared/types';

console.log('Content script loaded');

chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender,
  sendResponse
) => {
  console.log('Message received in content script:', message);

  if (message.type === 'GET_PAGE_INFO') {
    sendResponse({
      success: true,
      data: {
        title: document.title,
        url: window.location.href
      }
    });
  }
});
