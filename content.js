// Bootstrap Toolkit - Content Script
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

  let gridOverlay = null;
  let breakpointIndicator = null;
  let customBreakpoints = [];
  let isGridVisible = false;
  let gridColor = '#ff0000';

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
    
    const columns = gridOverlay.querySelectorAll('.bs-toolkit-grid-column');
    const rgb = hexToRgb(gridColor);
    
    columns.forEach((column, index) => {
      column.style.setProperty('background', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`, 'important');
      column.style.setProperty('border-left', `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`, 'important');
      column.style.setProperty('border-right', `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`, 'important');
      
      if (index === 0) {
        column.style.setProperty('border-left', `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`, 'important');
      }
      if (index === columns.length - 1) {
        column.style.setProperty('border-right', `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`, 'important');
      }
    });
  }

  function loadGridSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['customBreakpoints', 'gridVisible', 'gridColor'], (result) => {
        if (result.customBreakpoints) {
          customBreakpoints = result.customBreakpoints;
        }
        if (result.gridVisible !== undefined) {
          isGridVisible = result.gridVisible;
        }
        if (result.gridColor) {
          gridColor = result.gridColor;
        }
        // After settings are loaded and possibly after overlay/indicator are created, update their display
        if (gridOverlay) gridOverlay.style.display = isGridVisible ? 'block' : 'none';
        if (breakpointIndicator) breakpointIndicator.style.display = isGridVisible ? 'block' : 'none';
        if (gridOverlay) applyGridColor();

        resolve();
      });
    });
  }

  function createGridOverlay() {
    const existing = document.getElementById('bs-toolkit-grid-overlay');
    if (existing) existing.remove();

    gridOverlay = document.createElement('div');
    gridOverlay.id = 'bs-toolkit-grid-overlay';
    gridOverlay.className = 'bs-toolkit-grid-overlay';
    
    const container = document.createElement('div');
    container.className = 'bs-toolkit-grid-container';
    
    for (let i = 0; i < 12; i++) {
      const column = document.createElement('div');
      column.className = 'bs-toolkit-grid-column';
      container.appendChild(column);
    }
    
    gridOverlay.appendChild(container);
    document.body.appendChild(gridOverlay);
    
    applyGridColor();
    // Don't set display here; let loadGridSettings handle it after async load
  }

  function createBreakpointIndicator() {
    const existing = document.getElementById('bs-toolkit-breakpoint-indicator');
    if (existing) existing.remove();

    breakpointIndicator = document.createElement('div');
    breakpointIndicator.id = 'bs-toolkit-breakpoint-indicator';
    breakpointIndicator.className = 'bs-toolkit-breakpoint-indicator';
    document.body.appendChild(breakpointIndicator);
    // Don't set display here; let loadGridSettings handle it after async load
  }

  function toggleGrid() {
    isGridVisible = !isGridVisible;
    
    if (gridOverlay) {
      gridOverlay.style.display = isGridVisible ? 'block' : 'none';
    }
    if (breakpointIndicator) {
      breakpointIndicator.style.display = isGridVisible ? 'block' : 'none';
    }
    
    chrome.storage.sync.set({ gridVisible: isGridVisible });
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

  function updateBreakpointIndicator() {
    const current = getCurrentBreakpoint();

    if (breakpointIndicator) {
      breakpointIndicator.innerHTML = `
        <div class="bs-toolkit-bp-name">${current.name.toUpperCase()}</div>
        <div class="bs-toolkit-bp-width">${current.width}px</div>
        <div class="bs-toolkit-bp-range">${current.range}</div>
      `;
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
      }
    });
  }

  function injectPageScript() {
    if (injectedScriptLoaded) return;
    
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
      injectedScriptLoaded = true;
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
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
    tooltipEl.className = 'bs-toolkit-custom-tooltip';
    
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
      window.postMessage({ type: 'BS_TOOLKIT_SHOW_TOOLTIPS' }, '*');
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
      window.postMessage({ type: 'BS_TOOLKIT_HIDE_TOOLTIPS' }, '*');
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
      type: 'BS_TOOLKIT_OPEN_MODAL', 
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
    if (!data.type || !data.type.startsWith('BS_TOOLKIT_')) return;
    
    if (data.type === 'BS_TOOLKIT_READY') {
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
    else if (request.action === 'getGridState') {
      sendResponse({ visible: isGridVisible, breakpoint: getCurrentBreakpoint() });
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
    injectPageScript();

    window.addEventListener('resize', updateBreakpointIndicator);
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
