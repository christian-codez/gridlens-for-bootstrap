// GridLens for Bootstrap - Background Script
//
// Two jobs: the toolbar breakpoint badge, and ownership of per-tab grid
// visibility.
//
// Runs as a service worker on Chrome and as an event page on Firefox; the
// manifest declares both `service_worker` and `scripts` so each browser picks
// the one it supports. Both are non-persistent and get torn down when idle,
// so no state may live in module scope - see the storage note below.

// ---------------------------------------------------------------------------
// Per-tab grid visibility
// ---------------------------------------------------------------------------
//
// Grid visibility used to live in storage.sync alongside the real preferences.
// That made it global and cross-device: switching the grid on for one page left
// a red overlay on every site you visited afterwards, on every synced device,
// until you remembered to switch it off.
//
// It belongs to a tab, not to the user, so it lives here instead. The
// background is the only context that knows a content script's tab id
// (sender.tab.id) - a content script cannot see its own.
//
// storage.session rather than a plain object, because a non-persistent
// background gets terminated after a short idle and module-scope state would
// vanish with it. session storage survives that, and clears on browser restart,
// which is the right lifetime: a grid left on overnight should not come back.

const TAB_KEY_PREFIX = 'gridVisible:';
const tabKey = (tabId) => TAB_KEY_PREFIX + tabId;

async function getTabGridVisible(tabId) {
  const key = tabKey(tabId);
  const stored = await chrome.storage.session.get(key);
  return stored[key] === true;
}

async function setTabGridVisible(tabId, visible) {
  const key = tabKey(tabId);
  if (visible) {
    await chrome.storage.session.set({ [key]: true });
  } else {
    // Absent means hidden; don't accumulate `false` entries for every tab
    // the user has ever opened.
    await chrome.storage.session.remove(key);
  }
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

function updateBadge(tabId, breakpoint) {
  const text = breakpoint ? breakpoint.toUpperCase() : '';
  chrome.action.setBadgeText({ text, tabId });
  // GridLens teal. Deliberately not Bootstrap's brand purple (#6f42c1) -
  // the extension is unaffiliated and shouldn't borrow their palette.
  chrome.action.setBadgeBackgroundColor({ color: '#0B6E6B', tabId });
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ color: '#ffffff', tabId });
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Every message handled here concerns a specific tab. Messages from the
  // popup carry an explicit tabId; messages from a content script are
  // attributed to the tab they came from, which the sender cannot forge.
  const tabId = sender.tab ? sender.tab.id : request.tabId;

  if (request.action === 'updateBadge' && sender.tab) {
    updateBadge(sender.tab.id, request.breakpoint);
    return false;
  }

  if (request.action === 'getTabGridVisible') {
    if (typeof tabId !== 'number') {
      sendResponse({ visible: false });
      return false;
    }
    getTabGridVisible(tabId).then(visible => sendResponse({ visible }));
    return true; // async response
  }

  if (request.action === 'setTabGridVisible') {
    if (typeof tabId !== 'number') {
      sendResponse({ ok: false });
      return false;
    }
    setTabGridVisible(tabId, request.visible).then(() => sendResponse({ ok: true }));
    return true; // async response
  }

  return false;
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

// Drop a tab's entry when it closes, so session storage doesn't grow across a
// long browsing session. (tabs.onRemoved needs no permission - it carries only
// the tab id, not any sensitive tab property.)
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabKey(tabId));
});

// Older versions stored `gridVisible` in storage.sync, where it persisted and
// synced across devices. Remove that stale key on upgrade so it can't linger
// in a user's synced profile long after the extension stopped reading it.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update' || details.reason === 'install') {
    chrome.storage.sync.remove('gridVisible');
  }
});
