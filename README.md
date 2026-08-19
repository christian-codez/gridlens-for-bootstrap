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
- Draws only on pages that use Bootstrap. Navigate away to an unrelated site
  and the overlay disappears; come back and it returns, without re-toggling
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
- Define your own breakpoints if your project overrides Bootstrap's, and
  import or export a set as JSON to share it across a team

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

### Component Opener
Every Bootstrap JS component extends one base class providing
`getOrCreateInstance()`, so the whole set is drivable through one code path:

| | |
|---|---|
| Modals | opened, closing whatever was open first |
| Offcanvas | same |
| Toasts | shown without waiting for whatever triggers them |
| Dropdowns | opened in place |
| Tabs & pills | switched to |
| Collapse & accordions | expanded, named by their own trigger button |
| Carousels | set cycling |
| Popovers | shown |

Grouped by kind in the popup, and each is listed whether or not anything on the
page opens it. Works with Bootstrap 3, 4 and 5 — components that only exist in
later versions simply do not appear on older pages.

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

**Firefox** — needs the Firefox manifest, so build it first:

```sh
./package.sh --no-lint
npx web-ext run --source-dir dist/pkg-firefox
```

Or go to `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** and
select `dist/pkg-firefox/manifest.json`.

Requires Chrome 111+ or Firefox 128+.

## Usage

Click the GridLens icon in the toolbar, then pick a tab.

**Custom breakpoints** — a breakpoint is a name and the width it starts at,
the same shape as Bootstrap's `$grid-breakpoints`. Each one runs until the next
begins, so upper bounds are derived and shown rather than typed — which is what
makes gaps and overlaps impossible rather than merely discouraged. Import and
export accept our own format, a bare array, or the plain `{"sm": 576}` map you
can lift straight out of a project's Sass.

**Grid** — *Show Grid* toggles the overlay. *Container Type* switches between
`.container` (fixed max-width per breakpoint) and `.container-fluid` (full
width). The colour picker changes the overlay colour. Expand *Custom
Breakpoints* to define your own.

**Tooltips** — choose a Bootstrap version or leave it on auto-detect, then
*Show All Tooltips*.

**Components** — the dropdown lists everything found on the page, grouped by kind.
Select one and click *Open selected*. *Rescan page* picks up anything added since.

## Try it

`demo/index.html` is a Bootstrap 5 page exercising all three features, including a
modal, an offcanvas and a toast with no trigger button anywhere. Open it locally and work through the three tabs.

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
manifest.json        MV3 manifest, Chrome target
manifest.firefox.json  Firefox-only manifest differences, merged at build time
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

1.10.0

## Icons

`icons/icon.svg` is the master artwork. The four PNG sizes the manifest ships
are rendered from it:

```sh
./icons/build-icons.sh
```

The mark is three grid columns in GridLens teal, designed at 16px first — a lens
ring turned to mush at toolbar size, and a plain magnifier is indistinguishable
from a dozen other extensions in the same toolbar. The columns echo the Grid tab
icon in the popup, so the mark and the UI read as one family.

## Theme

| | | |
|---|---|---|
| Lime | `#cdfb47` | Primary — CTAs, active states, focus |
| Emerald | `#2f9e6a` | Toolbar badge only, see below |
| Ground | `#0a0b0a` | Page background |
| Surface | `#141613` | Panels and cards |
| Border | `#26281f` | Hairlines |
| Ink | `#edefe6` | Headings |
| Body | `#b9bcb2` | Body copy |

The palette is dark-first by construction: lime scores about 1.3:1 against white
and about 16:1 against `#0a0b0a`, so it only works on a dark ground. The popup is
dark because the accent requires it, not as a style preference.

**The badge is emerald, not lime, on purpose.** Chrome paints it over the icon,
and the icon is a dark tile carrying lime columns — a lime badge sits at 1.0:1
against those columns, which is what made the breakpoint hard to read. Emerald is
the only colour here that stays legible (5.8:1 for its text) while reading as
clearly separate from both the tile and the columns.

The popup palette is defined once as CSS custom properties at the top of
`popup.css`. Add colours there rather than inline, or the identity drifts —
which is how the extension ended up half indigo and half teal after the rename.

## Packaging

`./package.sh` builds one zip per browser into `dist/`, then lints the Firefox
one with the same validator AMO uses.

**Two manifests, on purpose.** Firefox has no background service worker support
and needs `background.scripts`; Chrome warns that *"'background.scripts'
requires manifest version of 2 or lower"*. A single manifest carrying both keys
works everywhere but warns everywhere — on every unpacked load and in the AMO
linter. The two stores are separate uploads anyway, so each gets a manifest with
only the keys it understands.

- `manifest.json` is the **Chrome** manifest, so loading this directory unpacked
  in Chrome is warning-free.
- `manifest.firefox.json` holds only the Firefox differences and is merged over
  it at package time. A `null` value there removes the key.

Files are staged into `dist/pkg-chrome/` and `dist/pkg-firefox/` and zipped from
inside, so `manifest.json` is structurally guaranteed to sit at the zip root —
both stores reject a zip of the containing folder. Only shipped files are
included; `docs/`, `demo/` and the tooling stay out.

Expect 0 errors and 1 known warning, documented in `STORE-LISTING.md`.

## License

[MIT](LICENSE)
