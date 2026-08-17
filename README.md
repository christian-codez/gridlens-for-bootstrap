# GridLens for Bootstrap

A browser extension for building and debugging Bootstrap layouts. Three tools that
otherwise mean digging through DevTools:

1. **📐 Grid Overlay** — draw the 12-column grid over any page
2. **💬 Tooltip Viewer** — reveal every tooltip at once
3. **🗔 Modal Opener** — open any modal on the page, including ones with no trigger

> GridLens is an independent project. It is **not affiliated with, endorsed by, or
> sponsored by the Bootstrap project** or its maintainers. "Bootstrap" is used here
> only to describe what the tool inspects.

## Features

### Grid Overlay
- Per-tab visibility — switching the grid on for the page you're working on
  leaves every other tab alone, and it clears when the tab closes
- Toggle a 12-column grid overlay that matches Bootstrap's real container
  geometry - correct max-widths and gutters for whichever major version the page
  uses, verified pixel-exact against Bootstrap 5.3 at every breakpoint
- Switch between `.container` and `.container-fluid`
- Live breakpoint readout (xs, sm, md, lg, xl, xxl) with the current viewport width
- The active breakpoint also shows on the toolbar icon badge, on any page that
  uses Bootstrap — and stays out of the way on pages that don't
- Custom overlay colour
- Define your own breakpoints if your project overrides Bootstrap's

### Version Detection
Detection runs in the page's own JavaScript context, so it sees what the page
actually loaded rather than guessing from markup. Four signals, strongest first:

1. **JavaScript globals** — `window.bootstrap`, or the jQuery plugin
   constructors used by Bootstrap 3 and 4. Yields an exact version, e.g. 5.3.3
2. **CSS custom properties** — the `--bs-*` variables Bootstrap 5 sets on `:root`
3. **Grid probe** — measures a throwaway row off-screen to recognise the grid on
   pages that load Bootstrap's CSS but not its JavaScript
4. **Markup conventions** — `data-bs-*` and `data-*` attributes

Bootstrap often loads after the page does, so detection re-checks and updates
when the answer changes.

### Tooltip Viewer
- Show or hide every Bootstrap tooltip on the page at once
- Auto-detects Bootstrap 3, 4, or 5
- Manual version override when detection guesses wrong
- Works with both jQuery-based and vanilla Bootstrap

### Modal Opener
- Scans the page and lists every modal it finds
- Pick one from the dropdown and open it — no trigger button needed
- Works with Bootstrap 3, 4, and 5

## Links

- **Homepage** — https://christian-codez.github.io/gridlens-for-bootstrap/
- **Privacy policy** — https://christian-codez.github.io/gridlens-for-bootstrap/privacy/
- **Support** — https://christian-codez.github.io/gridlens-for-bootstrap/support/

## Install

Not yet published to either store. To run it from source:

```sh
git clone https://github.com/christian-codez/gridlens-for-bootstrap.git
cd gridlens-for-bootstrap
```

**Chrome**
1. Clone or download this repository
2. Go to `chrome://extensions/`
3. Turn on **Developer mode** (top right)
4. **Load unpacked** → select the project folder

**Firefox**
1. Go to `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** → select `manifest.json`

Or, with [`web-ext`](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/):

```sh
npx web-ext run          # launches Firefox with the extension loaded
npx web-ext lint         # the same validator AMO runs on upload
```

Requires Chrome 111+ or Firefox 128+.

## Usage

Click the GridLens icon in the toolbar, then pick a tab.

**Grid** — *Show Grid* toggles the overlay. *Container Type* switches between
`.container` (fixed max-width per breakpoint) and `.container-fluid` (full
width). The colour picker changes the overlay colour. Expand *Custom
Breakpoints* to define your own.

**Tooltips** — choose a Bootstrap version or leave it on auto-detect, then
*Show All Tooltips*.

**Modals** — the dropdown lists every modal found on the page. Select one and click
*Open Selected Modal*. *Refresh Modal List* rescans after the page changes.

## Try it

`demo/index.html` is a Bootstrap 5 page exercising all three features, including a
modal with no trigger button. Open it locally and work through the three tabs.

## Compatibility

| | |
|---|---|
| Bootstrap | 3.x, 4.x, 5.x |
| Chrome | 111+ |
| Firefox | 128+ |
| Loading | jQuery-based and vanilla JS builds |

## Privacy

GridLens collects nothing. No analytics, no telemetry, no accounts, no servers.
Four settings live in your browser's extension storage and nowhere else.
See [PRIVACY.md](PRIVACY.md).

## Project layout

```
manifest.json        MV3 manifest; targets Chrome and Firefox from one file
background.js        Toolbar badge; service worker on Chrome, event page on Firefox
content.js           Grid overlay, tooltip and modal logic (isolated world)
injected.js          Page-context helper (MAIN world) for Bootstrap instance APIs
popup.html/.js/.css  Extension popup
styles.css           Overlay and indicator styles injected into pages
demo/index.html      Test fixture and screenshot surface
docs/privacy.html    Privacy policy, ready for GitHub Pages
STORE-LISTING.md     Pre-written answers for both store submission forms
```

## Version

1.4.1

## Packaging

`./package.sh` builds the store submission zip into `dist/`, then lints it.

Files are staged into `dist/pkg/` and zipped from there, so `manifest.json` is
structurally guaranteed to sit at the zip root — both stores reject a zip of the
containing folder. Only the files the extension ships are included; `docs/`,
`demo/` and the tooling stay out.

The lint runs against the staged payload rather than the working tree, so it
validates exactly what gets uploaded. Expect 0 errors and 2 known warnings,
both documented in `STORE-LISTING.md`.

## License

[MIT](LICENSE)
