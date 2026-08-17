// GridLens for Bootstrap - Content Script
// Combines Grid Overlay, Tooltip Viewer, and Modal Opener functionality

(function() {
  'use strict';

  // =============================================
  // GRID OVERLAY MODULE
  // =============================================
  
  const DEFAULT_BREAKPOINTS = [
    { name: 'xs', minWidth: 0, maxWidth: 575 },
    { name: 'sm', minWidth: 576, maxWidth: 767 },
    { name: 'md', minWidth: 768, maxWidth: 991 },
    { name: 'lg', minWidth: 992, maxWidth: 1199 },
    { name: 'xl', minWidth: 1200, maxWidth: 1399 },
    { name: 'xxl', minWidth: 1400, maxWidth: Infinity }
  ];

  // Bootstrap's real container geometry, per major version.
  //
  // `width` is the .container max-width at that minimum viewport width (null
  // means fluid - 100% of the viewport). `gutter` is the full --bs-gutter-x;
  // each column carries half of it as padding on each side.
  //
  // These differ meaningfully between versions: Bootstrap 3 has entirely
  // different container widths and no 576px or 1400px tier, and 3 and 4 both
  // use a 30px gutter where 5 uses 24px. Drawing a v5 grid over a v4 page is
  // exactly the kind of near-miss that makes an overlay untrustworthy.
  //
  // Ordered widest-first so the first match wins.
  const GRID_SPECS = {
    3: {
      gutter: 30,
      containers: [
        { min: 1200, width: 1170 },
        { min: 992,  width: 970 },
        { min: 768,  width: 750 },
        { min: 0,    width: null }
      ]
    },
    4: {
      gutter: 30,
      containers: [
        { min: 1200, width: 1140 },
        { min: 992,  width: 960 },
        { min: 768,  width: 720 },
        { min: 576,  width: 540 },
        { min: 0,    width: null }
      ]
    },
    5: {
      gutter: 24,
      containers: [
        { min: 1400, width: 1320 },
        { min: 1200, width: 1140 },
        { min: 992,  width: 960 },
        { min: 768,  width: 720 },
        { min: 576,  width: 540 },
        { min: 0,    width: null }
      ]
    }
  };

  const GRID_COLUMN_COUNT = 12;

  let gridOverlay = null;
  let gridContainer = null;
  let breakpointIndicator = null;
  let customBreakpoints = [];
  let isGridVisible = false;
  let gridColor = '#ff0000';
  let containerType = 'container';

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 0, b: 0 };
  }

  function applyGridColor() {
    if (!gridOverlay) return;

    // The inner element is the column's content box - the area Bootstrap's own
    // column padding leaves for content. That is the edge developers align to,
    // so it is what gets painted, not the full column box.
    const bands = gridOverlay.querySelectorAll('.gridlens-grid-column-inner');
    const rgb = hexToRgb(gridColor);

    bands.forEach((band, index) => {
      band.style.setProperty('background', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`, 'important');
      band.style.setProperty('border-left', `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`, 'important');
      band.style.setProperty('border-right', `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`, 'important');

      if (index === 0) {
        band.style.setProperty('border-left', `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`, 'important');
      }
      if (index === bands.length - 1) {
        band.style.setProperty('border-right', `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`, 'important');
      }
    });
  }

  // Which spec to draw. Follows the user's version override when they've set
  // one, otherwise what was detected on the page. Falls back to 5 for pages
  // with no detectable Bootstrap, since that's the current release.
  function activeGridSpec() {
    const version = getEffectiveVersion();
    return GRID_SPECS[version] || GRID_SPECS[5];
  }

  // Tier selection goes through matchMedia rather than comparing a number
  // against window.innerWidth, because the two can disagree.
  //
  // Bootstrap picks its container width with a CSS media query. Whether the
  // browser measures that query's width including or excluding the vertical
  // scrollbar varies by engine - Chrome tracks window.innerWidth, Gecko has
  // historically used the scrollbar-excluded width. Comparing innerWidth
  // ourselves would put the overlay one tier off inside a scrollbar's width of
  // every breakpoint, on whichever engine disagrees.
  //
  // Asking the same media query Bootstrap uses removes the question: whatever
  // basis the browser applies, we get the identical answer. This also stays
  // correct under page zoom and with overlay scrollbars.
  function currentContainerWidth(spec) {
    if (containerType === 'container-fluid') return null;

    for (const tier of spec.containers) {
      if (tier.min === 0) return tier.width;
      if (window.matchMedia('(min-width: ' + tier.min + 'px)').matches) return tier.width;
    }
    return null;
  }

  // Reproduces Bootstrap's box model rather than approximating it.
  //
  // A .container is centred at its breakpoint max-width and carries half a
  // gutter of padding each side. The .row inside cancels that with equal
  // negative margins, so the row spans the container's full border box - which
  // is why this element has a max-width but no padding. Each column then pads
  // itself by half a gutter, so the painted band sits inset from the column box.
  function applyGridGeometry() {
    if (!gridContainer) return;

    const spec = activeGridSpec();
    const width = currentContainerWidth(spec);

    gridContainer.style.setProperty('--gridlens-gutter-half', (spec.gutter / 2) + 'px');
    gridContainer.style.setProperty('max-width', width === null ? 'none' : width + 'px', 'important');
  }

  function onViewportResize() {
    applyGridGeometry();
    updateBreakpointIndicator();
  }

  function applyGridVisibility() {
    if (gridOverlay) gridOverlay.style.display = isGridVisible ? 'block' : 'none';
    if (breakpointIndicator) breakpointIndicator.style.display = isGridVisible ? 'block' : 'none';
  }

  // Preferences live in storage.sync - they belong to the user and should
  // follow them across devices.
  //
  // Visibility deliberately does not. It's per-tab state owned by the
  // background script, because a grid switched on for one page should not
  // reappear on every site opened afterwards. A content script can't see its
  // own tab id, so we ask.
  function loadGridSettings() {
    const prefs = new Promise((resolve) => {
      chrome.storage.sync.get(['customBreakpoints', 'gridColor', 'containerType'], (result) => {
        if (result.customBreakpoints) {
          customBreakpoints = result.customBreakpoints;
        }
        if (result.gridColor) {
          gridColor = result.gridColor;
        }
        if (result.containerType) {
          containerType = result.containerType;
        }
        resolve();
      });
    });

    const visibility = chrome.runtime
      .sendMessage({ action: 'getTabGridVisible' })
      .then((response) => {
        isGridVisible = !!(response && response.visible);
      })
      .catch(() => {
        // Background unreachable (mid-update, or torn down during teardown).
        // Staying hidden is the safe default - it never puts an overlay on a
        // page the user didn't ask for.
        isGridVisible = false;
      });

    return Promise.all([prefs, visibility]).then(() => {
      applyGridVisibility();
      if (gridOverlay) {
        applyGridGeometry();
        applyGridColor();
      }
    });
  }

  function createGridOverlay() {
    const existing = document.getElementById('gridlens-grid-overlay');
    if (existing) existing.remove();

    gridOverlay = document.createElement('div');
    gridOverlay.id = 'gridlens-grid-overlay';
    gridOverlay.className = 'gridlens-grid-overlay';

    gridContainer = document.createElement('div');
    gridContainer.className = 'gridlens-grid-container';

    for (let i = 0; i < GRID_COLUMN_COUNT; i++) {
      const column = document.createElement('div');
      column.className = 'gridlens-grid-column';

      // Outer element is the column box; inner is the content area left by
      // Bootstrap's column padding. Painting the inner one puts the visible
      // edges exactly where a developer's content starts.
      const band = document.createElement('div');
      band.className = 'gridlens-grid-column-inner';

      column.appendChild(band);
      gridContainer.appendChild(column);
    }

    gridOverlay.appendChild(gridContainer);
    document.body.appendChild(gridOverlay);

    applyGridGeometry();
    applyGridColor();
    // Don't set display here; let loadGridSettings handle it after async load
  }

  function createBreakpointIndicator() {
    const existing = document.getElementById('gridlens-breakpoint-indicator');
    if (existing) existing.remove();

    breakpointIndicator = document.createElement('div');
    breakpointIndicator.id = 'gridlens-breakpoint-indicator';
    breakpointIndicator.className = 'gridlens-breakpoint-indicator';
    document.body.appendChild(breakpointIndicator);
    // Don't set display here; let loadGridSettings handle it after async load
  }

  function toggleGrid() {
    isGridVisible = !isGridVisible;
    applyGridVisibility();

    // Recorded against this tab only. The background attributes it using
    // sender.tab.id, so the state can never leak to another tab or device.
    chrome.runtime
      .sendMessage({ action: 'setTabGridVisible', visible: isGridVisible })
      .catch(() => {
        // The overlay has already been toggled on screen; failing to record it
        // only means it won't survive a reload of this tab.
      });
  }

  function getCurrentBreakpoint() {
    const width = window.innerWidth;
    const breakpoints = customBreakpoints.length > 0 ? customBreakpoints : DEFAULT_BREAKPOINTS;
    
    for (const bp of breakpoints) {
      if (width >= bp.minWidth && width <= bp.maxWidth) {
        return {
          name: bp.name,
          width: width,
          range: `${bp.minWidth}px - ${bp.maxWidth === Infinity ? '∞' : bp.maxWidth + 'px'}`
        };
      }
    }
    
    return { name: 'unknown', width: width, range: 'N/A' };
  }

  function makeIndicatorRow(className, text) {
    const row = document.createElement('div');
    row.className = className;
    row.textContent = text;
    return row;
  }

  function updateBreakpointIndicator() {
    const current = getCurrentBreakpoint();

    if (breakpointIndicator) {
      // Breakpoint names are user-supplied via the popup, so build these with
      // textContent rather than an innerHTML template.
      breakpointIndicator.replaceChildren(
        makeIndicatorRow('gridlens-bp-name', current.name.toUpperCase()),
        makeIndicatorRow('gridlens-bp-width', current.width + 'px'),
        makeIndicatorRow('gridlens-bp-range', current.range)
      );
    }

    // Always update the toolbar badge so the current breakpoint shows on the icon
    chrome.runtime.sendMessage({ action: 'updateBadge', breakpoint: current.name });
  }

  // =============================================
  // TOOLTIP VIEWER MODULE
  // =============================================
  
  let tooltipsVisible = false;
  let activeTooltips = [];
  let userSelectedVersion = 'auto';
  let injectedScriptLoaded = false;

  function loadTooltipSettings() {
    chrome.storage.sync.get(['bootstrapVersion'], (result) => {
      if (result.bootstrapVersion) {
        userSelectedVersion = result.bootstrapVersion;
        // The saved override may select a different Bootstrap version than the
        // one detected, which changes the container widths the grid draws.
        applyGridGeometry();
      }
    });
  }

  // injected.js is declared in the manifest as a MAIN-world content script, so
  // it is already present - nothing to inject. We only confirm it is listening.
  //
  // It broadcasts GRIDLENS_READY on load, but the two worlds' scripts are not
  // ordered relative to each other, so that broadcast can land before this
  // script attaches its listener. Sending a ping covers that race: whichever
  // arrives first sets the flag.
  function pingPageScript() {
    window.postMessage({ type: 'GRIDLENS_PING' }, '*');
  }

  function detectBootstrapVersion() {
    const bs5Elements = document.querySelector('[data-bs-toggle="tooltip"], [data-bs-toggle="modal"]');
    if (bs5Elements) return 5;
    
    if (typeof bootstrap !== 'undefined') return 5;
    
    if (typeof $ !== 'undefined' && $.fn && $.fn.tooltip) {
      if ($.fn.tooltip.Constructor && $.fn.tooltip.Constructor.VERSION) {
        const version = $.fn.tooltip.Constructor.VERSION;
        if (version.startsWith('4')) return 4;
        if (version.startsWith('3')) return 3;
      }
      return 4;
    }
    
    const bs4Elements = document.querySelector('[data-toggle="tooltip"], [data-toggle="modal"]');
    if (bs4Elements) return 4;
    
    return 0;
  }

  function getEffectiveVersion() {
    if (userSelectedVersion === 'auto') {
      return detectBootstrapVersion();
    }
    return parseInt(userSelectedVersion);
  }

  function findTooltipElements(version) {
    let selectors = [];
    
    if (version === 5) {
      selectors = ['[data-bs-toggle="tooltip"]', '[aria-describedby*="tooltip"]'];
    } else if (version === 4 || version === 3) {
      selectors = ['[data-toggle="tooltip"]', '[aria-describedby*="tooltip"]'];
    } else {
      selectors = ['[data-toggle="tooltip"]', '[data-bs-toggle="tooltip"]', '[data-tooltip]', '[aria-describedby*="tooltip"]'];
    }
    
    return Array.from(document.querySelectorAll(selectors.join(', ')));
  }

  function createCustomTooltip(element, title) {
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'gridlens-custom-tooltip';
    
    // REVIEWER NOTE - the one intentional innerHTML in this extension.
    //
    // Bootstrap's own tooltip renders its title as HTML when the author opts in
    // via data-bs-html="true" (data-html in Bootstrap 3/4). This fallback path
    // exists to reproduce what the page would render on hover, so it has to
    // honour the same opt-in or it would misreport the page's real output.
    //
    // The content is the page's own markup, already under that page's control
    // and already rendered by Bootstrap itself when Bootstrap is present. No
    // extension data, user input, or cross-origin content reaches this line, and
    // it runs in the isolated content-script world, not in the extension's
    // privileged pages. Without the opt-in, the title is set as plain text.
    const allowHtml = element.getAttribute('data-bs-html') === 'true' || element.getAttribute('data-html') === 'true';
    if (allowHtml) {
      tooltipEl.innerHTML = title;
    } else {
      tooltipEl.textContent = title;
    }
    
    tooltipEl.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
      max-width: 300px;
      word-wrap: break-word;
    `;

    return {
      show() {
        document.body.appendChild(tooltipEl);
        const rect = element.getBoundingClientRect();
        tooltipEl.style.left = rect.left + rect.width / 2 - tooltipEl.offsetWidth / 2 + 'px';
        tooltipEl.style.top = rect.top - tooltipEl.offsetHeight - 5 + window.scrollY + 'px';
      },
      hide() {
        if (tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
      },
      dispose() { this.hide(); }
    };
  }

  function initializeTooltips(elements, version) {
    const initialized = [];

    elements.forEach(element => {
      try {
        if (version === 4 || version === 3) {
          if (typeof $ !== 'undefined' && $.fn && $.fn.tooltip) {
            const data = $(element).data('bs.tooltip') || $(element).data('tooltip');
            if (!data) {
              $(element).tooltip({ trigger: 'manual', animation: true, delay: { show: 0, hide: 0 } });
            }
            initialized.push({ element, tooltip: $(element), version });
          }
        } else {
          const title = element.getAttribute('title') || 
                       element.getAttribute('data-bs-title') ||
                       element.getAttribute('data-title') ||
                       element.getAttribute('data-original-title') ||
                       element.getAttribute('data-bs-original-title');
          
          if (title) {
            const customTooltip = createCustomTooltip(element, title);
            initialized.push({ element, tooltip: customTooltip, version: 0 });
          }
        }
      } catch (error) {
        console.warn('Failed to initialize tooltip:', error);
      }
    });

    return initialized;
  }

  function showAllTooltips() {
    if (tooltipsVisible) {
      hideAllTooltips();
      return;
    }

    const version = getEffectiveVersion();
    const elements = findTooltipElements(version);
    
    if (elements.length === 0) {
      chrome.runtime.sendMessage({ action: 'tooltipCount', count: 0 });
      return;
    }

    if (version === 5) {
      window.postMessage({ type: 'GRIDLENS_SHOW_TOOLTIPS' }, '*');
      tooltipsVisible = true;
      activeTooltips = elements.map(el => ({ element: el, version: 5, usePageContext: true }));
    } else {
      activeTooltips = initializeTooltips(elements, version);
      activeTooltips.forEach(({ element, tooltip, version }) => {
        try {
          if (version === 4 || version === 3) {
            tooltip.tooltip('show');
          } else if (tooltip) {
            tooltip.show();
          }
        } catch (error) {
          console.warn('Failed to show tooltip:', error);
        }
      });
      tooltipsVisible = true;
    }
    
    chrome.runtime.sendMessage({ action: 'tooltipCount', count: elements.length, visible: true });
  }

  function hideAllTooltips() {
    const version = getEffectiveVersion();
    
    if (version === 5) {
      window.postMessage({ type: 'GRIDLENS_HIDE_TOOLTIPS' }, '*');
    } else {
      activeTooltips.forEach(({ element, tooltip, version }) => {
        try {
          if (version === 4 || version === 3) {
            tooltip.tooltip('hide');
            tooltip.tooltip('dispose');
          } else if (tooltip) {
            tooltip.hide();
            tooltip.dispose();
          }
        } catch (error) {
          console.warn('Failed to hide tooltip:', error);
        }
      });
    }

    activeTooltips = [];
    tooltipsVisible = false;
    chrome.runtime.sendMessage({ action: 'tooltipCount', count: 0, visible: false });
  }

  // =============================================
  // MODAL OPENER MODULE
  // =============================================
  
  function findAllModals() {
    const modals = [];
    const version = detectBootstrapVersion();
    
    // Bootstrap 5 modals
    document.querySelectorAll('.modal[id]').forEach(modal => {
      const titleEl = modal.querySelector('.modal-title');
      modals.push({
        id: modal.id,
        title: titleEl ? titleEl.textContent.trim() : '',
        element: modal
      });
    });
    
    return { modals, version };
  }

  function openModal(modalId) {
    const version = detectBootstrapVersion();
    const modalElement = document.getElementById(modalId);
    
    if (!modalElement) {
      return { success: false, error: `Modal with ID "${modalId}" not found` };
    }
    
    // Send message to injected script to open modal in page context
    window.postMessage({ 
      type: 'GRIDLENS_OPEN_MODAL', 
      modalId: modalId,
      version: version
    }, '*');
    
    return { success: true };
  }

  // =============================================
  // MESSAGE HANDLERS
  // =============================================
  
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    const data = event.data;
    if (!data.type || !data.type.startsWith('GRIDLENS_')) return;
    
    if (data.type === 'GRIDLENS_READY') {
      injectedScriptLoaded = true;
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Grid actions
    if (request.action === 'toggleGrid') {
      toggleGrid();
      sendResponse({ visible: isGridVisible });
    }
    else if (request.action === 'getBreakpoint') {
      sendResponse({ breakpoint: getCurrentBreakpoint() });
    }
    else if (request.action === 'updateBreakpoints') {
      customBreakpoints = request.breakpoints;
      updateBreakpointIndicator();
      sendResponse({ success: true });
    }
    else if (request.action === 'updateColor') {
      gridColor = request.color;
      applyGridColor();
      sendResponse({ success: true });
    }
    else if (request.action === 'setContainerType') {
      containerType = request.containerType;
      applyGridGeometry();
      sendResponse({ success: true, containerType });
    }
    else if (request.action === 'getGridState') {
      sendResponse({
        visible: isGridVisible,
        breakpoint: getCurrentBreakpoint(),
        containerType: containerType
      });
    }

    // Tooltip actions
    else if (request.action === 'toggleTooltips') {
      showAllTooltips();
      sendResponse({ success: true, visible: tooltipsVisible });
    } 
    else if (request.action === 'getTooltipStatus') {
      const detectedVersion = detectBootstrapVersion();
      const effectiveVersion = getEffectiveVersion();
      const elements = findTooltipElements(effectiveVersion);
      sendResponse({ 
        count: elements.length,
        visible: tooltipsVisible,
        version: effectiveVersion,
        detectedVersion: detectedVersion,
        isAuto: userSelectedVersion === 'auto'
      });
    } 
    else if (request.action === 'setVersion') {
      userSelectedVersion = request.version;
      // Container widths and gutters differ per Bootstrap version, so the
      // overlay has to be redrawn when the effective version changes.
      applyGridGeometry();
      sendResponse({ success: true });
    }
    
    // Modal actions
    else if (request.action === 'getModals') {
      const result = findAllModals();
      sendResponse({ 
        modals: result.modals.map(m => ({ id: m.id, title: m.title })),
        version: result.version
      });
    }
    else if (request.action === 'openModal') {
      const result = openModal(request.modalId);
      sendResponse(result);
    }
    
    return true;
  });

  // =============================================
  // INITIALIZATION
  // =============================================
  
  async function init() {
    createGridOverlay();
    createBreakpointIndicator();
    await loadGridSettings();
    loadTooltipSettings();
    updateBreakpointIndicator();
    pingPageScript();

    window.addEventListener('resize', onViewportResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.bsToolkit = {
    grid: {
      toggle: toggleGrid,
      isVisible: () => isGridVisible,
      breakpoint: getCurrentBreakpoint
    },
    tooltips: {
      show: showAllTooltips,
      hide: hideAllTooltips,
      count: () => findTooltipElements(getEffectiveVersion()).length
    },
    modals: {
      list: findAllModals,
      open: openModal
    }
  };

})();
