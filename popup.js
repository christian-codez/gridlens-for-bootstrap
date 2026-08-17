// GridLens for Bootstrap - Popup Script

// ===== Constants =====
const DEFAULT_BREAKPOINTS = [
  { name: 'xs', minWidth: 0, maxWidth: 575 },
  { name: 'sm', minWidth: 576, maxWidth: 767 },
  { name: 'md', minWidth: 768, maxWidth: 991 },
  { name: 'lg', minWidth: 992, maxWidth: 1199 },
  { name: 'xl', minWidth: 1200, maxWidth: 1399 },
  { name: 'xxl', minWidth: 1400, maxWidth: 9999 }
];

// ===== State =====
let customBreakpoints = [];
let isGridVisible = false;
let gridColor = '#ff0000';
let containerType = 'container';

const CONTAINER_HINTS = {
  'container': 'Fixed max-width at each breakpoint.',
  'container-fluid': 'Full viewport width at every breakpoint.'
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  showVersion();
  setupTabs();
  loadSettings();
  setupGridPanel();
  setupTooltipsPanel();
  setupModalsPanel();
  setupCollapsibles();
  
  // Update breakpoint every second
  setInterval(updateCurrentBreakpoint, 1000);
});

// Read the version from the manifest rather than hardcoding it in the footer,
// where it silently fell out of step with manifest.json across two releases.
function showVersion() {
  const el = document.getElementById('ext-version');
  if (el) el.textContent = 'v' + chrome.runtime.getManifest().version;
}

// ===== Tab Navigation =====
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update panels
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`${tabId}-panel`).classList.add('active');
      
      // Refresh panel-specific data
      if (tabId === 'tooltips') {
        updateTooltipStatus();
      } else if (tabId === 'modals') {
        refreshModalsList();
      }
    });
  });
}

// ===== Collapsible Sections =====
function setupCollapsibles() {
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const target = document.getElementById(header.dataset.target);
      header.classList.toggle('expanded');
      target.classList.toggle('expanded');
    });
  });
}

// ===== Utility Functions =====
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendMessageToTab(message) {
  const tab = await getCurrentTab();
  return chrome.tabs.sendMessage(tab.id, message);
}

function showStatus(message, type = 'success') {
  const existing = document.querySelector('.status-message');
  if (existing) existing.remove();
  
  const statusDiv = document.createElement('div');
  statusDiv.className = `status-message ${type === 'error' ? 'error' : ''}`;
  statusDiv.textContent = message;
  document.body.appendChild(statusDiv);
  
  setTimeout(() => statusDiv.remove(), 2000);
}

// ===== Settings =====
//
// Preferences come from storage.sync. Grid visibility does not - it belongs to
// the active tab, so it's read from that tab's content script instead. Reading
// it from sync would show a toggle that doesn't match what's on screen.
function loadSettings() {
  chrome.storage.sync.get(['customBreakpoints', 'gridColor', 'bootstrapVersion', 'containerType'], (result) => {
    if (result.containerType) {
      containerType = result.containerType;
    }
    updateContainerTypeButtons();

    if (result.customBreakpoints && result.customBreakpoints.length > 0) {
      customBreakpoints = result.customBreakpoints;
      renderBreakpoints();
    }

    if (result.gridColor) {
      gridColor = result.gridColor;
      document.getElementById('gridColor').value = gridColor;
    }

    if (result.bootstrapVersion) {
      document.getElementById('version-select').value = result.bootstrapVersion;
    }
  });

  loadTabGridState();
}

function loadTabGridState() {
  sendMessageToTab({ action: 'getGridState' }).then(response => {
    if (!response) return;
    isGridVisible = !!response.visible;
    updateGridToggleButton();
  }).catch(() => {
    // No content script on this tab (a chrome:// page, the Web Store, a PDF,
    // or a tab opened before the extension was installed). Leave the toggle in
    // its default hidden state.
    isGridVisible = false;
    updateGridToggleButton();
  });
}

// ===== GRID PANEL =====
function setupGridPanel() {
  document.getElementById('toggleGrid').addEventListener('click', toggleGrid);
  document.getElementById('gridColor').addEventListener('change', updateGridColor);
  document.getElementById('resetColor').addEventListener('click', resetGridColor);
  document.getElementById('addBreakpoint').addEventListener('click', addBreakpoint);
  document.getElementById('saveBreakpoints').addEventListener('click', saveBreakpoints);
  document.getElementById('resetBreakpoints').addEventListener('click', resetBreakpoints);

  // Responsive Preview
  document.querySelectorAll('.responsive-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const width = parseInt(btn.getAttribute('data-width'));
      setTabWidth(width);
    });
  });

  // Container type switch
  document.querySelectorAll('.container-type-btn').forEach(btn => {
    btn.addEventListener('click', () => setContainerType(btn.dataset.container));
  });

  updateCurrentBreakpoint();
}

function setContainerType(type) {
  containerType = type;
  updateContainerTypeButtons();

  chrome.storage.sync.set({ containerType }, () => {
    sendMessageToTab({ action: 'setContainerType', containerType })
      .catch(() => {});
  });
}

function updateContainerTypeButtons() {
  document.querySelectorAll('.container-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.container === containerType);
  });

  const hint = document.getElementById('container-hint');
  if (hint) hint.textContent = CONTAINER_HINTS[containerType] || '';
}

// Responsive Preview: Resize the current tab window
function setTabWidth(width) {
  chrome.windows.getCurrent({}, function(win) {
    chrome.windows.update(win.id, { width: width, focused: true });
  });
}

function toggleGrid() {
  sendMessageToTab({ action: 'toggleGrid' }).then(response => {
    if (response) {
      isGridVisible = response.visible;
      updateGridToggleButton();
    }
  }).catch(err => {
    showStatus('Could not toggle grid', 'error');
  });
}

function updateGridToggleButton() {
  const button = document.getElementById('toggleGrid');
  // The icon no longer needs touching here - both states are in the DOM and
  // CSS reveals the right one from the button's .active class.
  const text = document.getElementById('toggleGridText');
  
  if (isGridVisible) {
    button.classList.add('active');
    text.textContent = 'Hide Grid';
  } else {
    button.classList.remove('active');
    text.textContent = 'Show Grid';
  }
}

function updateCurrentBreakpoint() {
  sendMessageToTab({ action: 'getBreakpoint' }).then(response => {
    if (response && response.breakpoint) {
      document.getElementById('bp-name').textContent = response.breakpoint.name.toUpperCase();
      document.getElementById('bp-width').textContent = response.breakpoint.width + 'px';
    }
  }).catch(() => {});
}

function updateGridColor(e) {
  gridColor = e.target.value;
  chrome.storage.sync.set({ gridColor }, () => {
    sendMessageToTab({ action: 'updateColor', color: gridColor });
    showStatus('Grid color updated!');
  });
}

function resetGridColor() {
  gridColor = '#ff0000';
  document.getElementById('gridColor').value = gridColor;
  chrome.storage.sync.set({ gridColor }, () => {
    sendMessageToTab({ action: 'updateColor', color: gridColor });
    showStatus('Color reset to red');
  });
}

function makeBreakpointInput(type, placeholder, value, index, field) {
  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;
  input.dataset.index = String(index);
  input.dataset.field = field;
  return input;
}

function renderBreakpoints() {
  const container = document.getElementById('breakpointsList');
  container.replaceChildren();
  
  customBreakpoints.forEach((bp, index) => {
    const item = document.createElement('div');
    item.className = 'breakpoint-item';

    const inputs = document.createElement('div');
    inputs.className = 'breakpoint-inputs';

    // Built with createElement and property assignment rather than an innerHTML
    // template: breakpoint names are user-supplied and this is a privileged
    // extension page. Setting .value as a property never parses as markup.
    inputs.appendChild(makeBreakpointInput('text', 'Name', bp.name, index, 'name'));
    inputs.appendChild(makeBreakpointInput('number', 'Min (px)', bp.minWidth, index, 'minWidth'));
    inputs.appendChild(makeBreakpointInput(
      'number', 'Max (px)', bp.maxWidth === 9999 ? '' : bp.maxWidth, index, 'maxWidth'
    ));

    const remove = document.createElement('button');
    remove.className = 'btn-remove';
    remove.textContent = 'Remove';
    remove.dataset.index = String(index);

    item.appendChild(inputs);
    item.appendChild(remove);
    container.appendChild(item);
  });
  
  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      if (field === 'name') {
        customBreakpoints[index][field] = e.target.value;
      } else {
        const value = parseInt(e.target.value);
        customBreakpoints[index][field] = isNaN(value) || e.target.value === '' ? 9999 : value;
      }
    });
  });
  
  container.querySelectorAll('.btn-remove').forEach(button => {
    button.addEventListener('click', (e) => {
      customBreakpoints.splice(parseInt(e.target.dataset.index), 1);
      renderBreakpoints();
    });
  });
}

function addBreakpoint() {
  customBreakpoints.push({ name: '', minWidth: 0, maxWidth: 9999 });
  renderBreakpoints();
}

function saveBreakpoints() {
  const valid = customBreakpoints.every(bp => 
    bp.name && bp.name.trim() !== '' && !isNaN(bp.minWidth) && !isNaN(bp.maxWidth) && bp.minWidth >= 0
  );
  
  if (!valid) {
    showStatus('Please fill all fields correctly', 'error');
    return;
  }
  
  customBreakpoints.sort((a, b) => a.minWidth - b.minWidth);
  
  chrome.storage.sync.set({ customBreakpoints }, () => {
    sendMessageToTab({ action: 'updateBreakpoints', breakpoints: customBreakpoints });
    showStatus('Breakpoints saved!');
  });
}

function resetBreakpoints() {
  customBreakpoints = [];
  chrome.storage.sync.set({ customBreakpoints: [] }, () => {
    renderBreakpoints();
    sendMessageToTab({ action: 'updateBreakpoints', breakpoints: [] });
    showStatus('Reset to Bootstrap defaults');
  });
}

const VERSION_NAMES = { 0: 'None detected', 3: 'Bootstrap 3', 4: 'Bootstrap 4', 5: 'Bootstrap 5' };

// Detection now reaches the page's own globals, so an exact version string is
// often available. Show it when we have it - "Bootstrap 5.3.3" tells you far
// more than "Bootstrap 5", particularly when the grid looks wrong.
function describeVersion(response) {
  const name = VERSION_NAMES[response.version] || 'Unknown';
  if (!response.version) return name;

  const exact = response.exactVersion;
  const label = exact ? `Bootstrap ${exact}` : name;
  return response.isAuto ? `${label} (auto)` : `${label} (manual)`;
}

// ===== TOOLTIPS PANEL =====
function setupTooltipsPanel() {
  document.getElementById('toggleTooltips').addEventListener('click', toggleTooltips);
  document.getElementById('version-select').addEventListener('change', (e) => {
    const version = e.target.value;
    chrome.storage.sync.set({ bootstrapVersion: version });
    sendMessageToTab({ action: 'setVersion', version }).then(() => {
      updateTooltipStatus();
    });
  });
  
  updateTooltipStatus();
}

function toggleTooltips() {
  const btn = document.getElementById('toggleTooltips');
  const text = document.getElementById('toggleTooltipsText');
  
  btn.disabled = true;
  text.textContent = 'Loading...';
  
  sendMessageToTab({ action: 'toggleTooltips' }).then(() => {
    setTimeout(updateTooltipStatus, 100);
  }).catch(err => {
    text.textContent = 'Error - Retry';
    btn.disabled = false;
  });
}

function updateTooltipStatus() {
  sendMessageToTab({ action: 'getTooltipStatus' }).then(response => {
    const countEl = document.getElementById('tooltip-count');
    const versionEl = document.getElementById('bootstrap-version');
    const statusEl = document.getElementById('tooltip-status');
    const btn = document.getElementById('toggleTooltips');
    const text = document.getElementById('toggleTooltipsText');
    
    countEl.textContent = response.count;
    
    versionEl.textContent = describeVersion(response);
    versionEl.title = response.detectionSource
      ? `Detected from the page's ${response.detectionSource}`
      : 'No Bootstrap detected on this page';
    
    if (response.visible) {
      statusEl.textContent = 'Visible';
      statusEl.style.color = '#22c55e';
      text.textContent = 'Hide All Tooltips';
      btn.classList.add('active');
    } else {
      statusEl.textContent = 'Hidden';
      statusEl.style.color = '#94a3b8';
      text.textContent = 'Show All Tooltips';
      btn.classList.remove('active');
    }
    
    btn.disabled = response.count === 0;
    btn.title = response.count === 0 ? 'No tooltips found' : `Toggle ${response.count} tooltip(s)`;
  }).catch(err => {
    document.getElementById('tooltip-count').textContent = 'Error';
  });
}

// ===== MODALS PANEL =====
function setupModalsPanel() {
  document.getElementById('openModal').addEventListener('click', openSelectedModal);
  document.getElementById('refreshModals').addEventListener('click', refreshModalsList);
  
  // Also open modal on double-click of select
  document.getElementById('modal-select').addEventListener('dblclick', openSelectedModal);
  
  refreshModalsList();
}

function openSelectedModal() {
  const selectEl = document.getElementById('modal-select');
  const modalId = selectEl.value;
  
  if (!modalId) {
    showStatus('Please select a modal first', 'error');
    return;
  }
  
  sendMessageToTab({ action: 'openModal', modalId }).then(response => {
    if (response.success) {
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      showStatus(`Modal "${selectedOption.text}" opened!`);
    } else {
      showStatus(response.error || 'Could not open modal', 'error');
    }
  }).catch(err => {
    showStatus('Could not open modal', 'error');
  });
}

// Replaces the select's contents with a single non-selectable message.
// Modal IDs and titles come from arbitrary page markup, so every option in this
// file is built with createElement and textContent - nothing here parses as HTML.
function setSelectMessage(selectEl, message) {
  const option = document.createElement('option');
  option.value = '';
  option.textContent = message;
  selectEl.replaceChildren(option);
}

function refreshModalsList() {
  const selectEl = document.getElementById('modal-select');
  const countEl = document.getElementById('modal-count');
  const versionEl = document.getElementById('modal-bs-version');
  const openBtn = document.getElementById('openModal');

  setSelectMessage(selectEl, '-- Scanning... --');
  selectEl.disabled = true;
  openBtn.disabled = true;

  sendMessageToTab({ action: 'getModals' }).then(response => {
    countEl.textContent = response.modals.length;

    versionEl.textContent = response.exactVersion
      ? `Bootstrap ${response.exactVersion}`
      : (VERSION_NAMES[response.version] || 'Unknown');

    if (response.modals.length === 0) {
      setSelectMessage(selectEl, '-- No modals found --');
      selectEl.disabled = true;
      openBtn.disabled = true;
      return;
    }

    selectEl.replaceChildren();

    // Add placeholder option
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = `-- Select a modal (${response.modals.length} found) --`;
    selectEl.appendChild(placeholder);

    // Add modal options
    response.modals.forEach(modal => {
      const option = document.createElement('option');
      option.value = modal.id;
      option.textContent = modal.title ? `#${modal.id} - ${modal.title}` : `#${modal.id}`;
      selectEl.appendChild(option);
    });

    selectEl.disabled = false;
    openBtn.disabled = false;
  }).catch(err => {
    setSelectMessage(selectEl, '-- Error loading modals --');
    countEl.textContent = '-';
    selectEl.disabled = true;
    openBtn.disabled = true;
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'tooltipCount') {
    updateTooltipStatus();
  }
});
