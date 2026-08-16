// Bootstrap Toolkit - Injected Script
// Runs in page context to access Bootstrap instances

(function() {
  'use strict';

  // Listen for messages from content script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    const data = event.data;
    if (!data.type || !data.type.startsWith('BS_TOOLKIT_')) return;
    
    switch (data.type) {
      case 'BS_TOOLKIT_SHOW_TOOLTIPS':
        showTooltips();
        break;
      case 'BS_TOOLKIT_HIDE_TOOLTIPS':
        hideTooltips();
        break;
      case 'BS_TOOLKIT_OPEN_MODAL':
        openModal(data.modalId, data.version);
        break;
    }
  });

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
      type: 'BS_TOOLKIT_TOOLTIPS_SHOWN',
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
      type: 'BS_TOOLKIT_TOOLTIPS_HIDDEN',
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
        type: 'BS_TOOLKIT_MODAL_ERROR',
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
      type: 'BS_TOOLKIT_MODAL_OPENED',
      success: success,
      modalId: modalId
    }, '*');
  }

  // Signal that the script is loaded
  window.postMessage({
    type: 'BS_TOOLKIT_READY'
  }, '*');
  
})();
