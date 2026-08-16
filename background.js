// Bootstrap Toolkit - Background Service Worker
// Updates the toolbar icon badge with the current breakpoint

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge' && sender.tab) {
    const text = request.breakpoint ? request.breakpoint.toUpperCase() : '';
    chrome.action.setBadgeText({ text, tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#6f42c1', tabId: sender.tab.id });
    if (chrome.action.setBadgeTextColor) {
      chrome.action.setBadgeTextColor({ color: '#ffffff', tabId: sender.tab.id });
    }
  }
});
