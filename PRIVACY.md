# Privacy Policy — GridLens for Bootstrap

**Last updated:** 16 August 2026

## Summary

GridLens does not collect, transmit, store, or sell any personal data. There is no
analytics, no telemetry, no error reporting, no advertising, and no remote server of
any kind. Nothing the extension sees ever leaves your browser.

## What the extension can access

GridLens runs on the pages you visit in order to do its job — drawing a grid overlay,
finding tooltip elements, and listing Bootstrap modals requires reading the structure
of the page in front of you.

This reading happens entirely inside your browser, in memory, while the page is open.
Page content is never copied, retained, logged, or sent anywhere. When you close or
navigate away from a page, nothing about it is kept.

## What the extension stores

GridLens saves four preferences using your browser's built-in extension storage:

| Setting | What it holds |
|---|---|
| `gridColor` | The overlay colour you picked |
| `customBreakpoints` | Any custom breakpoint names and widths you defined |
| `bootstrapVersion` | Your Bootstrap version override, or `auto` |
| `containerType` | Whether the overlay draws a `.container` or `.container-fluid` |

These are stored through the browser's `storage.sync` API. If you are signed in to
Chrome or Firefox with sync enabled, your browser may sync these four values across
your own devices, in the same way it syncs your bookmarks. That transfer is handled
by your browser under its own privacy policy — the extension author has no access to
it and operates no server that could receive it.

Separately, whether the grid overlay is currently switched on is held per browser
tab in session storage. It is never synced, never leaves the device, and is
discarded when you close the tab or quit the browser.

You can erase all of it at any time by removing the extension, or by using the reset
buttons in the extension's popup.

## What the extension does not do

- No data is sent to the developer or to any third party.
- No accounts, sign-in, or identifiers of any kind.
- No cookies are read or written.
- No browsing history, URLs, form input, passwords, or page text is collected.
- No code is downloaded or executed from a remote source. Everything that runs ships
  inside the reviewed extension package.

## Permissions, and why each is needed

**`storage`** — to save the four preferences listed above so they survive a browser
restart, and to track which tabs currently have the grid switched on for the
length of the browsing session.

**`activeTab`** — so the popup can talk to the current tab when you click the toolbar
icon. Granted only for the tab you are looking at, only while you are using the
extension.

**Access to all websites** (declared through the content script's `<all_urls>` match
pattern) — GridLens is a developer tool for inspecting Bootstrap layouts, and the
developer using it may be working on any site: localhost, a staging server, a client's
production domain. The extension cannot know in advance which sites those will be, so
it must be able to run wherever you are building. It uses this access solely to draw
the overlay and locate Bootstrap components on the page you have open.

## Children

GridLens is a software development tool with no content directed at children and
collects no data from anyone, including children.

## Changes

If this policy ever changes, the revision will be published at this URL and the "last
updated" date above will change. Because the extension collects nothing, any change
would be a clarification rather than a new use of data.

## Contact

Questions about this policy: see <https://chada.ca/gridlens/support/>, or open an
issue at <https://github.com/christian-codez/gridlens-for-bootstrap/issues>

---

*GridLens is an independent project. It is not affiliated with, endorsed by, or
sponsored by the Bootstrap project or its maintainers. "Bootstrap" is used only to
describe what the tool inspects.*
