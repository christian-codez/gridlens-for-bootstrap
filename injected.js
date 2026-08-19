// GridLens for Bootstrap - Page-context script
//
// Declared in the manifest as a content script with "world": "MAIN", so it runs
// in the page's own execution environment and can reach Bootstrap's globals and
// instance APIs (bootstrap.Modal, jQuery plugins) that the isolated content
// script cannot see.
//
// This replaces the previous approach of appending a <script src> tag from
// content.js, which any page with a restrictive script-src CSP would block -
// silently breaking Bootstrap 5 tooltips and all modal opening on those sites.
// Declarative MAIN-world injection is not subject to page CSP.
//
// Being in the MAIN world means no extension APIs are available here (no
// chrome.*). Everything crosses to the isolated world via window.postMessage.

(function() {
  'use strict';

  // Both worlds share this document, so its own origin is the only correct
  // target. This channel carries no privilege: everything reachable through it
  // calls Bootstrap methods on the page's own components, which the page can
  // already do directly. The guards are here because an unvalidated listener
  // reads as untrusted-input handling, not because there is an escalation to
  // prevent.
  const PAGE_ORIGIN = window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
    : '*';

  function postToPage(message) {
    window.postMessage(message, PAGE_ORIGIN);
  }

  // Listen for messages from the content script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (PAGE_ORIGIN !== '*' && event.origin !== PAGE_ORIGIN) return;

    const data = event.data;
    if (!data || typeof data.type !== 'string' || !data.type.startsWith('GRIDLENS_')) return;

    switch (data.type) {
      case 'GRIDLENS_PING':
        announceReady();
        announceDetection(true);
        break;
      case 'GRIDLENS_DETECT':
        announceDetection(true);
        break;
      case 'GRIDLENS_SHOW_TOOLTIPS':
        showTooltips();
        break;
      case 'GRIDLENS_HIDE_TOOLTIPS':
        hideTooltips();
        break;
      case 'GRIDLENS_OPEN_COMPONENT':
        openComponent(data);
        break;
    }
  });

  function announceReady() {
    postToPage({ type: 'GRIDLENS_READY' });
  }

  // ===== BOOTSTRAP DETECTION =====
  //
  // This has to happen here, in the page's own world. The isolated content
  // script cannot see `window.bootstrap` or the page's jQuery at all - a
  // `typeof bootstrap` check over there always reads 'undefined', however much
  // Bootstrap the page is running.
  //
  // Four signals, strongest first. Each returns null when it finds nothing, so
  // detection falls through to the next.

  // 1. JavaScript globals. The only signal that yields an exact version.
  function versionFromGlobals() {
    // Bootstrap 5 exposes a `bootstrap` global; every component carries VERSION.
    const bs = window.bootstrap;
    if (bs) {
      const v = (bs.Tooltip && bs.Tooltip.VERSION) ||
                (bs.Modal && bs.Modal.VERSION) ||
                (bs.Collapse && bs.Collapse.VERSION) || '';
      return { version: parseInt(v, 10) || 5, exact: v || null, source: 'javascript' };
    }

    // Bootstrap 3 and 4 register jQuery plugins whose Constructor holds VERSION.
    const jq = window.jQuery || window.$;
    if (jq && jq.fn) {
      const ctor = (jq.fn.tooltip && jq.fn.tooltip.Constructor) ||
                   (jq.fn.modal && jq.fn.modal.Constructor) ||
                   (jq.fn.collapse && jq.fn.collapse.Constructor);
      const v = ctor && ctor.VERSION;
      const major = parseInt(v, 10);
      if (major) return { version: major, exact: v, source: 'javascript' };
    }
    return null;
  }

  // 2. Bootstrap 5 defines --bs-* custom properties on :root.
  function versionFromCssVariables() {
    const root = getComputedStyle(document.documentElement);
    const v = root.getPropertyValue('--bs-primary') || root.getPropertyValue('--bs-blue');
    return v && v.trim() ? { version: 5, exact: null, source: 'stylesheet' } : null;
  }

  // 3. Grid probe. Many sites load Bootstrap's CSS without its JavaScript and
  //    use only the grid, so there is no global and no data-bs-* markup to
  //    find. Render a throwaway row off-screen and measure whether a column
  //    comes out at one twelfth of it. Measured as a ratio rather than an
  //    absolute width, because .row's negative margins differ between versions.
  // The probe forces a synchronous layout, and detection re-runs a few times to
  // catch late-loading Bootstrap. Repeating it on every pass would mean four
  // reflows on every page with no Bootstrap at all - the common case.
  //
  // So the last result is memoised against the stylesheet count, since a new
  // stylesheet is the only thing that could change the answer. Note this caches
  // the result rather than merely skipping the work: returning null on a repeat
  // pass would drop a positive finding and let detection fall through to a
  // weaker signal, flipping a correctly-identified page back to "none".
  let probeCache = { sheetCount: -1, result: null };

  function versionFromGridProbe() {
    if (!document.body) return null;

    const sheetCount = document.styleSheets.length;
    if (sheetCount === probeCache.sheetCount) return probeCache.result;

    const host = document.createElement('div');
    host.setAttribute('style',
      'position:absolute!important;left:-99999px!important;top:0!important;' +
      'width:1200px!important;visibility:hidden!important;pointer-events:none!important');

    const row = document.createElement('div');
    row.className = 'row';
    const col = document.createElement('div');    // Bootstrap 4 and 5
    col.className = 'col-1';
    const colXs = document.createElement('div');  // Bootstrap 3
    colXs.className = 'col-xs-1';
    row.appendChild(col);
    row.appendChild(colXs);
    host.appendChild(row);
    document.body.appendChild(host);

    let result = null;
    try {
      const rowWidth = row.getBoundingClientRect().width;
      if (rowWidth > 0) {
        const twelfth = 1 / 12;
        const ratio = (el) => el.getBoundingClientRect().width / rowWidth;
        if (Math.abs(ratio(col) - twelfth) < 0.004) {
          result = { version: 4, exact: null, source: 'stylesheet' };
        } else if (Math.abs(ratio(colXs) - twelfth) < 0.004) {
          result = { version: 3, exact: null, source: 'stylesheet' };
        }
      }
    } catch (e) {
      // Probing must never break the host page.
    } finally {
      host.remove();
    }

    probeCache = { sheetCount: sheetCount, result: result };
    return result;
  }

  // 4. Markup conventions. Weakest signal, but catches pages that ship only
  //    component markup.
  function versionFromMarkup() {
    if (document.querySelector('[data-bs-toggle],[data-bs-target],[data-bs-theme],[data-bs-dismiss]')) {
      return { version: 5, exact: null, source: 'markup' };
    }
    if (document.querySelector('[data-toggle],[data-target],[data-dismiss]')) {
      return { version: 4, exact: null, source: 'markup' };
    }
    return null;
  }

  function detectBootstrap() {
    return versionFromGlobals()
        || versionFromCssVariables()
        || versionFromGridProbe()
        || versionFromMarkup()
        || { version: 0, exact: null, source: null };
  }

  let lastSignature = null;

  function announceDetection(force) {
    const info = detectBootstrap();
    const signature = info.version + '|' + (info.exact || '') + '|' + (info.source || '');
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    postToPage({ type: 'GRIDLENS_BOOTSTRAP_INFO', info: info });
  }

  // Bootstrap frequently arrives after this script runs - async bundles,
  // deferred scripts, SPA routes that load it on demand. Re-check a few times
  // and report only when the answer actually changes.
  function scheduleRechecks() {
    [400, 1200, 3000].forEach(function (ms) {
      setTimeout(function () { announceDetection(false); }, ms);
    });
  }

  // ===== TOOLTIP FUNCTIONS =====
  
  function showTooltips() {
    const selectors = '[data-bs-toggle="tooltip"], [aria-describedby*="tooltip"]';
    const elements = document.querySelectorAll(selectors);
    let shownCount = 0;
    
    elements.forEach(function(el) {
      let instance = null;
      
      // Try to get existing Bootstrap 5 instance
      if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        if (bootstrap.Tooltip.getInstance) {
          instance = bootstrap.Tooltip.getInstance(el);
        }
        if (!instance && bootstrap.Tooltip.getOrCreateInstance) {
          instance = bootstrap.Tooltip.getOrCreateInstance(el);
        }
      } else if (typeof Tooltip !== 'undefined') {
        if (Tooltip.getInstance) {
          instance = Tooltip.getInstance(el);
        }
      }
      
      if (instance && instance.show) {
        instance.show();
        shownCount++;
      }
    });
    
    postToPage({
      type: 'GRIDLENS_TOOLTIPS_SHOWN',
      count: shownCount
    });
  }

  function hideTooltips() {
    const selectors = '[data-bs-toggle="tooltip"], [aria-describedby*="tooltip"]';
    const elements = document.querySelectorAll(selectors);
    let hiddenCount = 0;
    
    elements.forEach(function(el) {
      let instance = null;
      
      if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip && bootstrap.Tooltip.getInstance) {
        instance = bootstrap.Tooltip.getInstance(el);
      } else if (typeof Tooltip !== 'undefined' && Tooltip.getInstance) {
        instance = Tooltip.getInstance(el);
      }
      
      if (instance && instance.hide) {
        instance.hide();
        hiddenCount++;
      }
    });
    
    postToPage({
      type: 'GRIDLENS_TOOLTIPS_HIDDEN',
      count: hiddenCount
    });
  }

  // ===== COMPONENT FUNCTIONS =====
  //
  // Every Bootstrap JS component extends one base class providing
  // getOrCreateInstance(), so the whole set is drivable through one map. The
  // jQuery entries cover Bootstrap 3 and 4, where components are registered as
  // jQuery plugins instead.
  //
  // Carousel gets cycle() rather than show(): starting playback is the useful
  // equivalent of "open this" for a carousel. Offcanvas has no jQuery entry
  // because it does not exist before Bootstrap 5.
  const OPENERS = {
    modal:     { cls: 'Modal',     jq: (el) => $(el).modal('show') },
    offcanvas: { cls: 'Offcanvas', jq: null },
    toast:     { cls: 'Toast',     jq: (el) => $(el).toast('show') },
    dropdown:  { cls: 'Dropdown',  jq: (el) => $(el).dropdown('toggle') },
    tab:       { cls: 'Tab',       jq: (el) => $(el).tab('show') },
    collapse:  { cls: 'Collapse',  jq: (el) => $(el).collapse('show') },
    carousel:  { cls: 'Carousel',  jq: (el) => $(el).carousel('cycle'), method: 'cycle' },
    popover:   { cls: 'Popover',   jq: (el) => $(el).popover('show') }
  };

  // Overlays own the screen, so opening one should close any other. The rest -
  // toasts, dropdowns, tabs, accordions - legitimately coexist and are left
  // alone.
  const OVERLAY_TYPES = { modal: true, offcanvas: true };

  const OVERLAY_SELECTOR = '.modal, .offcanvas';

  function instanceFor(el) {
    // Whichever Bootstrap put it there, or null if the page has no Bootstrap JS
    // driving this element.
    for (const name of ['Modal', 'Offcanvas', 'Toast', 'Dropdown', 'Tab', 'Collapse', 'Carousel', 'Popover']) {
      try {
        const ctor = typeof bootstrap !== 'undefined' && bootstrap[name];
        if (ctor && ctor.getInstance) {
          const instance = ctor.getInstance(el);
          if (instance) return { kind: 'bs5', instance: instance };
        }
      } catch (e) { /* try the next */ }
    }

    try {
      if (typeof Modal !== 'undefined' && Modal.getInstance) {
        const instance = Modal.getInstance(el);
        if (instance) return { kind: 'bs5', instance: instance };
      }
    } catch (e) { /* fall through */ }

    try {
      if (typeof $ !== 'undefined' && $.fn && $.fn.modal && ($(el).data('bs.modal') || $(el).data('bs.offcanvas'))) {
        return { kind: 'jquery', instance: $(el) };
      }
    } catch (e) { /* fall through */ }

    return null;
  }

  function isOpen(el) {
    return el.classList.contains('show') ||
           el.classList.contains('in') ||        // Bootstrap 3
           el.getAttribute('aria-modal') === 'true';
  }

  // Closes any open overlay and calls done() once the page has actually
  // finished closing it.
  //
  // An earlier version called hide() and immediately force-wrote display:none,
  // stripped .show, removed every backdrop and dropped body.modal-open. hide()
  // is asynchronous - Bootstrap drives it through a CSS fade and cleans up in
  // its own transition handler - so that raced its teardown, leaving an inline
  // display:none on a modal the page later tried to reopen and a body stuck
  // scroll-locked.
  //
  // So: if the page is managing an overlay, ask it to close and wait for its
  // own "finished" event. Only overlays with no instance get cleaned up by
  // hand, because nothing else is going to do it.
  function closeOverlays(done) {
    const open = Array.from(document.querySelectorAll(OVERLAY_SELECTOR)).filter(isOpen);

    if (!open.length) {
      done();
      return;
    }

    let pending = 0;
    let settled = false;
    let forced = false;
    const retries = [];

    function finish() {
      if (settled) return;
      settled = true;
      retries.forEach(clearInterval);

      // Deliberately does not force a Bootstrap-managed overlay shut, even if
      // one is somehow still open by now.
      //
      // Ripping the classes off leaves Bootstrap's internal _isShown true, so
      // every later show() on that element returns early and the page can never
      // open it again - a permanent break in exchange for tidying a transient
      // one. Its teardown also runs afterwards and would strip the backdrop and
      // body lock belonging to whichever overlay we just opened.
      //
      // If a close overruns we proceed and let Bootstrap finish in its own
      // time. Worst case is a brief second backdrop that clears itself.

      // Clean up only after overlays nothing on the page was managing: there is
      // no instance coming along later to do it.
      if (forced) {
        document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach(function (b) { b.remove(); });
        document.body.classList.remove('modal-open', 'offcanvas-open');
        document.body.style.removeProperty('padding-right');
        document.body.style.removeProperty('overflow');
      }

      done();
    }

    // Bootstrap's fade is 300ms. This only exists so an overlay whose
    // transition never fires cannot hang the open forever.
    const guard = setTimeout(finish, 1500);

    function settle() {
      pending--;
      if (pending <= 0) {
        clearTimeout(guard);
        finish();
      }
    }

    function askToHide(found) {
      if (found.kind === 'jquery') found.instance.modal('hide');
      else found.instance.hide();
    }

    open.forEach(function (el) {
      const found = instanceFor(el);

      if (found) {
        pending++;
        let done = false;

        const onHidden = function () {
          if (done) return;
          done = true;
          clearInterval(retry);
          settle();
        };
        el.addEventListener('hidden.bs.modal', onHidden, { once: true });
        el.addEventListener('hidden.bs.offcanvas', onHidden, { once: true });

        // Bootstrap's hide() opens with
        //   if (!this._isShown || this._isTransitioning) return
        // so asking an overlay to close while it is still fading in does
        // nothing at all - silently. Clicking the extension within the 300ms
        // a modal takes to open lands exactly there, and the old code then sat
        // waiting for a hidden event that was never coming, gave up, and opened
        // the next overlay on top of the first.
        //
        // Rather than reading Bootstrap's private transition flag, just ask
        // again until it takes. Once the transition ends the next attempt
        // succeeds and the hidden event arrives.
        const retry = setInterval(function () {
          if (done) { clearInterval(retry); return; }
          if (!isOpen(el)) { onHidden(); return; }
          try { askToHide(found); } catch (e) { onHidden(); }
        }, 120);
        retries.push(retry);

        try {
          askToHide(found);
        } catch (e) {
          onHidden();
        }
        return;
      }

      // No instance: nothing on the page owns this, so undo by hand what the
      // fallback path below did.
      forced = true;
      el.classList.remove('show', 'in');
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('aria-modal');
    });

    if (pending === 0) {
      clearTimeout(guard);
      finish();
    }
  }

  // Resolves the element the content script scanned.
  //
  // Id first, because it survives the DOM changing between the scan and the
  // click. Index into the same selector is the fallback, which is all there is
  // for the many dropdowns and tabs that carry no id.
  function resolveElement(data) {
    if (data.id) {
      const byId = document.getElementById(data.id);
      if (byId) return byId;
    }
    if (typeof data.selector === 'string' && typeof data.index === 'number') {
      return document.querySelectorAll(data.selector)[data.index] || null;
    }
    return null;
  }

  function openComponent(data) {
    const spec = OPENERS[data.componentType];
    if (!spec) {
      postToPage({ type: 'GRIDLENS_COMPONENT_ERROR', error: 'Unknown component type' });
      return;
    }

    const el = resolveElement(data);
    if (!el) {
      postToPage({ type: 'GRIDLENS_COMPONENT_ERROR', error: 'Component not found on the page' });
      return;
    }

    if (OVERLAY_TYPES[data.componentType]) {
      closeOverlays(function () { showComponent(el, spec, data.componentType); });
    } else {
      showComponent(el, spec, data.componentType);
    }
  }

  function showComponent(el, spec, type) {
    const method = spec.method || 'show';
    let success = false;

    // Bootstrap 5: one shape for every component.
    if (typeof bootstrap !== 'undefined' && bootstrap[spec.cls]) {
      try {
        bootstrap[spec.cls].getOrCreateInstance(el)[method]();
        success = true;
      } catch (e) {
        console.warn('GridLens: Bootstrap 5 ' + type + ' failed', e);
      }
    }

    // Bootstrap 3 and 4 register components as jQuery plugins instead.
    if (!success && spec.jq && typeof $ !== 'undefined' && $.fn) {
      try {
        spec.jq(el);
        success = true;
      } catch (e) {
        console.warn('GridLens: jQuery ' + type + ' failed', e);
      }
    }

    // Last resort, and only for modals: a page can load Bootstrap's CSS without
    // its JavaScript, and a modal is the one component whose open state is
    // purely presentational enough to fake convincingly.
    if (!success && type === 'modal') {
      try {
        el.classList.add('show');
        el.style.display = 'block';
        el.setAttribute('aria-hidden', 'false');
        if (!document.querySelector('.modal-backdrop')) {
          const backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop fade show';
          document.body.appendChild(backdrop);
        }
        document.body.classList.add('modal-open');
        success = true;
      } catch (e) {
        console.warn('GridLens: manual modal open failed', e);
      }
    }

    postToPage({
      type: 'GRIDLENS_COMPONENT_OPENED',
      success: success,
      componentType: type
    });
  }

  // Signal that the script is loaded. The isolated content script may not have
  // attached its listener yet when this fires, so it also sends GRIDLENS_PING
  // on init and we answer that with the same announcement.
  announceReady();
  announceDetection(true);
  scheduleRechecks();

})();
