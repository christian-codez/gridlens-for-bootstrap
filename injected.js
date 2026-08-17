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

  // Listen for messages from the content script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || !data.type || !data.type.startsWith('GRIDLENS_')) return;

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
      case 'GRIDLENS_OPEN_MODAL':
        openModal(data.modalId, data.version);
        break;
    }
  });

  function announceReady() {
    window.postMessage({ type: 'GRIDLENS_READY' }, '*');
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
    window.postMessage({ type: 'GRIDLENS_BOOTSTRAP_INFO', info: info }, '*');
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
    
    window.postMessage({
      type: 'GRIDLENS_TOOLTIPS_SHOWN',
      count: shownCount
    }, '*');
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
    
    window.postMessage({
      type: 'GRIDLENS_TOOLTIPS_HIDDEN',
      count: hiddenCount
    }, '*');
  }

  // ===== MODAL FUNCTIONS =====

  function closeAllModals() {
    // Find all modals on the page
    const allModals = document.querySelectorAll('.modal');

    allModals.forEach(function(modal) {
      // Try Bootstrap 5
      if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        try {
          const instance = bootstrap.Modal.getInstance(modal);
          if (instance) {
            instance.hide();
          }
        } catch (e) {
          // Silent fail
        }
      }

      // Try Bootstrap 4/3 with jQuery
      if (typeof $ !== 'undefined' && $.fn && $.fn.modal) {
        try {
          $(modal).modal('hide');
        } catch (e) {
          // Silent fail
        }
      }

      // Try standalone Modal class
      if (typeof Modal !== 'undefined') {
        try {
          const instance = Modal.getInstance(modal);
          if (instance) {
            instance.hide();
          }
        } catch (e) {
          // Silent fail
        }
      }

      // Manual cleanup
      modal.classList.remove('show');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    });

    // Remove all backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(function(backdrop) {
      backdrop.remove();
    });

    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
  }

  function openModal(modalId, version) {
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
      window.postMessage({
        type: 'GRIDLENS_MODAL_ERROR',
        error: 'Modal not found'
      }, '*');
      return;
    }

    // Close all other modals first
    closeAllModals();

    let success = false;
    
    // Try Bootstrap 5
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      try {
        let instance = bootstrap.Modal.getInstance(modalElement);
        if (!instance) {
          instance = new bootstrap.Modal(modalElement);
        }
        instance.show();
        success = true;
      } catch (e) {
        console.warn('Bootstrap 5 modal open failed:', e);
      }
    }
    
    // Try Bootstrap 4/3 with jQuery
    if (!success && typeof $ !== 'undefined' && $.fn && $.fn.modal) {
      try {
        $(modalElement).modal('show');
        success = true;
      } catch (e) {
        console.warn('jQuery modal open failed:', e);
      }
    }
    
    // Try standalone Modal class (some Bootstrap builds)
    if (!success && typeof Modal !== 'undefined') {
      try {
        let instance = Modal.getInstance(modalElement);
        if (!instance) {
          instance = new Modal(modalElement);
        }
        instance.show();
        success = true;
      } catch (e) {
        console.warn('Modal class open failed:', e);
      }
    }
    
    // Fallback: manually show modal with CSS
    if (!success) {
      try {
        modalElement.classList.add('show');
        modalElement.style.display = 'block';
        modalElement.setAttribute('aria-hidden', 'false');
        
        // Add backdrop
        let backdrop = document.querySelector('.modal-backdrop');
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop fade show';
          document.body.appendChild(backdrop);
        }
        
        document.body.classList.add('modal-open');
        success = true;
      } catch (e) {
        console.warn('Manual modal open failed:', e);
      }
    }
    
    window.postMessage({
      type: 'GRIDLENS_MODAL_OPENED',
      success: success,
      modalId: modalId
    }, '*');
  }

  // Signal that the script is loaded. The isolated content script may not have
  // attached its listener yet when this fires, so it also sends GRIDLENS_PING
  // on init and we answer that with the same announcement.
  announceReady();
  announceDetection(true);
  scheduleRechecks();

})();
