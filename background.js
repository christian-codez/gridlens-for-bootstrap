// GridLens for Bootstrap - Background Script
// Updates the toolbar icon badge with the current breakpoint.
//
// Runs as a service worker on Chrome and as an event page on Firefox; the
// manifest declares both `service_worker` and `scripts` so each browser picks
// the one it supports. Firefox only honours `scripts` alongside `service_worker`
// from version 121, which is why the manifest sets strict_min_version 121.0.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge' && sender.tab) {
    const text = request.breakpoint ? request.breakpoint.toUpperCase() : '';
    chrome.action.setBadgeText({ text, tabId: sender.tab.id });
    // GridLens teal. Deliberately not Bootstrap's brand purple (#6f42c1) -
    // the extension is unaffiliated and shouldn't borrow their palette.
    chrome.action.setBadgeBackgroundColor({ color: '#0B6E6B', tabId: sender.tab.id });
    if (chrome.action.setBadgeTextColor) {
      chrome.action.setBadgeTextColor({ color: '#ffffff', tabId: sender.tab.id });
    }
  }
});
