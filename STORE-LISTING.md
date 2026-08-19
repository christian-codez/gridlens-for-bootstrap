# Store submission answers — GridLens for Bootstrap v1.10.0

Everything the Chrome and Firefox submission forms ask for, written out in advance.
Copy from here into the forms rather than composing in the browser.

> **Publisher identity — individual, non-trader.**
>
> | | |
> |---

## Name

```
GridLens for Bootstrap
```

Under Chrome's 75-character limit. Leads with our own mark; "for Bootstrap"
is descriptive nominative use rather than a claim of affiliation.

## Short description (Chrome, 132 char max — this is 121)

```
Inspect Bootstrap layouts: grid overlay, live breakpoint readout, tooltip viewer, and component opener.
```

## Summary (Firefox AMO, 250 char max)

```
A developer tool for working with Bootstrap. Overlay the 12-column grid, watch the active breakpoint change as you resize, reveal every tooltip on the page at once, and open any component without hunting for its trigger. Works with Bootstrap 3, 4 and 5.
```

## Detailed description (both stores)

```
GridLens is a developer tool for building and debugging Bootstrap layouts. It puts
a handful of things a click away that otherwise mean digging through DevTools.

GRID OVERLAY
Draw the 12-column grid over any Bootstrap page and see exactly where your
columns fall. The overlay appears only where Bootstrap is actually in use, so
it never follows you onto unrelated sites.
The overlay reproduces Bootstrap's real container geometry - the correct
max-width and gutter for each breakpoint, matched to whichever major version
the page uses - so it lines up with your actual columns instead of
approximating them. Switch between .container and .container-fluid. Pick any
overlay colour. A floating readout shows the active breakpoint and the current
viewport width, updating live as you resize.

VERSION DETECTION
Detection runs in the page's own JavaScript context rather than guessing from
markup, so it reports the exact version the page loaded - 5.3.3 rather than
just "Bootstrap 5". It recognises pages that load Bootstrap's CSS without its
JavaScript, and re-checks when Bootstrap arrives late.

TOOLTIP VIEWER
Reveal every Bootstrap tooltip on the page at once, instead of hovering each
element one at a time to check copy, positioning, and overflow. Detects whether
the page runs Bootstrap 3, 4, or 5, with a manual override when you need it.

COMPONENT OPENER
Lists every Bootstrap component on the page — modals, offcanvas panels, toasts,
dropdowns, tabs, accordions, carousels and popovers — and opens the one you
pick. No need to find the button that triggers it, or to fake application state
to reach it. Components with no trigger anywhere on the page are listed too.

CUSTOM BREAKPOINTS
Ships with Bootstrap's defaults (xs, sm, md, lg, xl, xxl). If your project
overrides them, define your own: a breakpoint is just a name and the width it
starts at, so ranges are worked out for you and cannot end up with gaps or
overlaps. Export a set as JSON to share it across a team, or paste one in -
including the plain name-to-width map you can lift straight out of a project's
Sass.

PRIVACY
No analytics, no telemetry, no accounts, no servers. GridLens sends nothing
anywhere. Your settings are saved in your browser's own extension storage and nowhere else. Full policy: https://christian-codez.github.io/gridlens-for-bootstrap/privacy/

GridLens is an independent project. It is not affiliated with, endorsed by, or
sponsored by the Bootstrap project or its maintainers.
```

## Trader status

Every developer must self-declare trader or non-trader status. The EU Digital
Services Act defines them as:

- **Trader** — "acting for purposes relating to his trade, business, craft or
  profession"
- **Non-trader** — "acting for purposes which are outside of his trade,
  business, craft or profession"

Only **traders** must supply a legal name, address and SMS-capable phone number,
and that information is **displayed publicly on the listing**. Non-traders
declare their status and supply none of it; consumers are told instead that
consumer-protection rights do not apply to the download.

This extension is published as an individual, free, with no commercial link to
any business — which is why the listing carries no agency name, no agency domain,
and no paid tier. Publishing the same tool under a business identity would point
the other way.

The declaration is yours to make and it carries legal weight, so if your
circumstances are less clear-cut than this, that is a question for an accountant
or a lawyer rather than a checklist.

### Support contact — use the URL, not an email

Neither store requires a support email. Chrome's listing takes a **Support URL**,
and AMO accepts a support site in place of an address — it recommends an email as
a minimum but does not demand one. So give the support page and no email:

```
https://christian-codez.github.io/gridlens-for-bootstrap/support/
```

That page routes to GitHub Issues, which is a better channel than email for a
developer tool anyway: public, searchable, and threaded, so an answer helps the
next person who hits the same thing.

Do not use an address on a business domain here. It would not by itself make you
a trader — the test is the purpose of the activity, not which domain appears in a
form field — but it is displayed publicly, and it reconnects the extension to a
business in one step on a listing that declares no commercial link. That is the
weakest point to leave in the declaration, and it routes scraped spam into
business mail for no gain.

If a submission form turns out to insist on an address, use a dedicated one made
for this and tied to neither you personally nor any business.

**Regardless of status:** the publishing Google account must have 2-Step
Verification enabled or it cannot publish at all.

## URLs

Both forms ask for these.

| Field | Value |
|---|---|
| Homepage | `https://christian-codez.github.io/gridlens-for-bootstrap/` |
| Privacy policy | `https://christian-codez.github.io/gridlens-for-bootstrap/privacy/` |
| Support site | `https://christian-codez.github.io/gridlens-for-bootstrap/support/` |
| Support email | *none — see below* |
| Source repository | `https://github.com/christian-codez/gridlens-for-bootstrap` |

## Category

- **Chrome:** Developer Tools
- **Firefox:** Web Development

## Language

English (United States)

---

# Chrome Web Store — Privacy tab

The tab that most often causes a rejection. Every field below is required.

### Single purpose description

```
GridLens is a developer tool that visually inspects Bootstrap layouts on a web
page. It overlays the Bootstrap grid, reports the active responsive breakpoint,
reveals tooltips, and opens Bootstrap components so a developer can check their
markup without stepping through the interface by hand. Every feature serves that
one purpose: inspecting Bootstrap components on the page currently open.
```

### Permission justifications

**`storage`**
```
Saves four user preferences so they survive a browser restart: the grid overlay
colour, any custom breakpoint definitions the user has entered, the user's
Bootstrap version override, and whether the overlay draws a .container or a
.container-fluid.

Also used for session-scoped state: which tabs currently have the grid switched
on. That is per-tab, never synced, and discarded when the browser closes. No
other data is written to storage.
```

**`activeTab`**
```
The extension's popup needs to send messages to the content script running in the
tab the user is looking at in order to toggle the grid, query the current
breakpoint, and list the Bootstrap components on the page. activeTab scopes this
to the single
tab the user has open at the moment they click the toolbar icon.
```

**Host permission — access to all websites**
```
GridLens is a developer tool for inspecting Bootstrap layouts, and a developer may
be working on any origin: localhost, a private staging server, a client's
production domain, or a CodePen. The extension cannot know these origins ahead of
time, so it must be able to run wherever the user is building.

The content script only reads page structure in order to draw the grid overlay and
locate Bootstrap components. It transmits nothing, stores no page content, and
contacts no server. There is no analytics or telemetry of any kind.
```

**Remote code**
```
No. All code executes from within the extension package. Nothing is fetched or
evaluated at runtime.
```

### Data usage certification

Check **none** of the data collection categories. Then tick all three
certification boxes:

- [x] I do not sell or transfer user data to third parties, apart from the approved use cases
- [x] I do not use or transfer user data for purposes unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

```
https://christian-codez.github.io/gridlens-for-bootstrap/privacy/
```

---

# Firefox AMO — submission answers

### Distribution channel

**On this site** (listed on addons.mozilla.org).

### Source code upload required?

**No.** Nothing in the package is minified, obfuscated, bundled, or generated by a
build step. Every file ships as authored and is readable as submitted — keep it
that way, because introducing a bundler means uploading buildable source and
having a reviewer reproduce your artifact.

### License

MIT — see `LICENSE` in the repository root.

### Notes to reviewer

```
GridLens is a Bootstrap layout inspector with no network activity of any kind.

Testing it needs a page that actually uses Bootstrap. The repository includes a
demo page at demo/index.html covering every feature — open it from the
filesystem, then:

  1. Grid tab      -> "Show Grid" draws the 12-column overlay; it should sit
                      exactly on the demo page's real columns. Resize and the
                      breakpoint readout and container tier both track it.
                      "Container Type" switches to .container-fluid.
  2. Tooltips tab  -> "Show All Tooltips" reveals all five tooltips at once.
                      The version readout should show the exact Bootstrap
                      version the demo page loads.
  3. Components tab -> the dropdown lists twelve components grouped by kind.
                      Picking any one opens it, including the modal, offcanvas
                      and toast that nothing on the page triggers.

On permissions: the content script matches <all_urls> because a developer using
this tool may be working on any origin — localhost, staging, a client's domain.
It reads page structure to draw the overlay and find Bootstrap components, and
does nothing else with it. There is no analytics, no telemetry, no remote code,
and no server. Settings are four values in storage.sync, plus per-tab grid visibility in
session storage, and nothing more.

On the MAIN-world content script: injected.js is declared with "world": "MAIN"
because reaching Bootstrap's own instance APIs (bootstrap.Modal.getInstance,
jQuery plugin methods) requires running in the page's execution environment.
The previous approach appended a <script src> tag, which any page with a
restrictive script-src CSP blocked, silently breaking modal opening on a large
share of real sites. injected.js contains no extension APIs, no network calls,
and no page-data collection - it only calls show/hide on Bootstrap components
in response to messages from the popup. This is why strict_min_version is 128.0
(Firefox's first release supporting manifest-declared MAIN world) and
minimum_chrome_version is 111.

On the two validator warnings, both of which are intentional:

  1. MANIFEST_FIELD_UNSUPPORTED - "/background/service_worker" is not supported.
     Expected. The manifest declares both "service_worker" and "scripts" so one
     package targets both browsers, per the cross-browser guidance in the MDN
     background key documentation. Firefox ignores service_worker and runs
     background.js as an event page; Chrome does the reverse. strict_min_version
     is 121.0 because earlier Firefox versions would not start the background
     page when service_worker was also present.

  2. UNSAFE_VAR_ASSIGNMENT - innerHTML at content.js:255.
     The only innerHTML in the extension, and deliberate. Bootstrap's own tooltip
     renders its title as HTML when the page author opts in with
     data-bs-html="true". This fallback path reproduces what the page would show
     on hover, so it must honour the same opt-in or it would misreport the page's
     actual output. The value is the page's own markup, already under that page's
     control, and this runs in the isolated content-script world rather than in
     any extension page. Without the opt-in the title is assigned as plain text.
     There is an explanatory comment at that line in the source.
```

### Deliberately not done: localisation

The extension ships no `_locales` directory and sets no `default_locale`.

With only an English locale that machinery changes nothing — not the interface,
which shows the same strings either way, and not the store listing, which needs
real translations to localise. What it does add is a runtime substitution step,
markup that no longer reads as the text it renders, and a failure mode where one
missing message key stops the extension loading at all.

It is not a one-way door. Add `_locales/en/messages.json` and `default_locale`
at the point there is a second language to put in it, and the work is the same
size then as now.

### Validator status at time of writing

```
$ ./package.sh

errors     0
notices    0
warnings   1   (explained in the reviewer notes above)
```

`package.sh` builds a separate zip per browser and lints the Firefox payload —
so this validates exactly what AMO receives, not the working tree. Linting the
working tree instead reports spurious warnings for `package.sh` itself and for
Chrome-only manifest keys, none of which ship.

**Upload the right zip to each store:**

| Store | File |
|---|---|
| Chrome Web Store | `dist/gridlens-for-bootstrap-vX.Y.Z-chrome.zip` |
| Firefox AMO | `dist/gridlens-for-bootstrap-vX.Y.Z-firefox.zip` |

Re-run before every upload. Errors block submission; this warning does not, and
should stay at exactly one — a second means something new was introduced.

---

# Screenshots

Both stores accept the same images. Chrome wants 1280×800 or 640×400; five is the
maximum and more than one is strongly advised.

Built and ready in `store-assets/`, all 24-bit RGB with **no alpha channel** —
the store rejects images that carry one.

| File | Size | Required? |
|---|---|---|
| `store-icon-128.png` | 128×128 | **yes** — the listing's own icon |
| `promo-440x280.png` | 440×280 | **yes** — small promotional tile |
| `1-grid.png` | 1280×800 | at least one screenshot |
| `2-tooltips.png` | 1280×800 | |
| `3-components.png` | 1280×800 | |
| `4-fluid.png` | 1280×800 | |
| `5-breakpoints.png` | 1280×800 | |
| `marquee-1400x560.png` | 1400×560 | no — needed only for marquee placement |

Three things the store is strict about, each of which will stop an upload:

- **Screenshots are 1280×800 or 640×400 and nothing else.** A 2× render is
  refused, so `store-assets/2x/` keeps the 2560×1600 masters and the files at the
  top level are the ones to upload.
- **No alpha channel.** The extension's own `icons/icon128.png` keeps its
  transparency because the toolbar needs it; `store-icon-128.png` is a separate,
  flattened copy for the listing. Do not swap one for the other.
- **The store icon is deliberately not pre-rounded.** An upload with no alpha is
  placed in a frame with a 12px corner radius, so rounding it here would show the
  tile's own corners cut off inside that frame.

All screenshots are against `demo/index.html`, never a third party's site — a
screenshot containing someone else's branding is its own review problem.

How they were made, so you can judge them: the page states are real Bootstrap
5.3.3 rendered headless at 1280×800, using the extension's own `styles.css` for
the overlay and Bootstrap's own APIs for the tooltips and modal. The popup is
the real `popup.html` and `popup.css` against a stub that returns exactly what
the demo page reports. Each image is those two composited, which is normal for
store assets. Nothing depicted is behaviour the extension does not have — but
load the extension and eyeball them side by side before uploading.

1. **Grid overlay active** — overlay on, breakpoint readout visible top-right,
   popup open on the Grid tab. This is the listing's lead image.
2. **Breakpoint tracking** — a narrower window showing a different breakpoint, so
   the responsive behaviour is legible from the thumbnail.
3. **All tooltips revealed** — the Tooltips tab with all five showing at once,
   which is the clearest single argument for the feature.
4. **Modal list** — the Modals tab with the dropdown open, showing detected modals.
5. **Custom breakpoints** — the expanded editor, showing it is configurable.

**Chrome promotional tile** — 440×280. Optional, but required to ever be
considered for featuring. Worth making once.

---

# Pre-submission blockers still open

- [ ] Replace `christian-codez` in all four files
- [ ] Publish `docs/privacy.html` to GitHub Pages and confirm the URL resolves
- [ ] Take the five screenshots against `demo/index.html`
- [ ] Load unpacked in Chrome and confirm no console errors
- [ ] Load in Firefox via `web-ext run` and confirm settings persist across a reload
- [ ] Run `npx web-ext lint` and clear all errors
