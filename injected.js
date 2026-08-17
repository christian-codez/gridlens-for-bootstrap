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

})();
