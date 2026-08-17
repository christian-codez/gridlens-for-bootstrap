// GridLens for Bootstrap - Popup Script

// ===== Constants =====
// A breakpoint is a name and the width it starts at, matching Bootstrap's own
// $grid-breakpoints. The upper bound is derived from the next entry, so it is
// shown but never typed - which is what removes the whole class of gaps,
// overlaps and contradictory bounds the previous min+max editor allowed.
const DEFAULT_BREAKPOINTS = [
  { name: 'xs',  minWidth: 0 },
  { name: 'sm',  minWidth: 576 },
  { name: 'md',  minWidth: 768 },
  { name: 'lg',  minWidth: 992 },
  { name: 'xl',  minWidth: 1200 },
  { name: 'xxl', minWidth: 1400 }
];

// ===== State =====
let customBreakpoints = [];
let isGridVisible = false;
let gridColor = '#ff0000';
let containerType = 'container';
let gridAvailable = true;

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
  setupBreakpointIO();
  
  // No polling. This used to message the content script once a second for as
  // long as the popup was open, swallowing every rejection - so on a page with
  // no content script it just showed "Error" forever with no reason given.
  // The breakpoint is read once on open, and again only when something that
  // could change it happens.
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

// chrome.storage.sync enforces write quotas - 120 a minute, 1800 an hour - and
// reports going over through runtime.lastError. Nothing checked it, so a
// rejected write looked exactly like a successful one.
function saveSync(values, onSaved) {
  chrome.storage.sync.set(values, () => {
    if (chrome.runtime.lastError) {
      const msg = chrome.runtime.lastError.message || '';
      showStatus(/quota|QUOTA|MAX_WRITE/.test(msg)
        ? 'Saving too fast — wait a moment and try again'
        : 'Could not save settings', 'error');
      return;
    }
    if (onSaved) onSaved();
  });
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

    // Seed the editor with Bootstrap's defaults when nothing is stored. It used
    // to open empty, so anyone wanting to tweak one breakpoint had to retype all
    // six from memory first.
    customBreakpoints = (result.customBreakpoints && result.customBreakpoints.length)
      ? result.customBreakpoints.map(bp => ({
          name: String(bp.name || '').trim(),
          // Sets saved by earlier versions carried a maxWidth; it is derived now.
          minWidth: Math.max(0, parseInt(bp.minWidth, 10) || 0)
        })).sort((a, b) => a.minWidth - b.minWidth)
      : cloneDefaults();
    renderBreakpoints();
    refreshJson();

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
    gridAvailable = response.available !== false;
    updateGridToggleButton();
  }).catch(() => {
    // No content script on this tab (a chrome:// page, the Web Store, a PDF,
    // or a tab opened before the extension was installed).
    isGridVisible = false;
    gridAvailable = false;
    updateGridToggleButton('unsupported');
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

  saveSync({ containerType }, () => {
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

// Responsive Preview
//
// Three things stopped this hitting the width on the button. A maximized window
// ignores a width change unless it is taken out of that state first. Window
// width is not viewport width - browser chrome and the scrollbar eat some of it,
// so asking for 1200 left the page narrower than 1200 and reporting the wrong
// breakpoint. And the OS enforces a minimum window width that is usually above
// 375, so the narrowest button could not be honoured at all.
//
// So: drop out of maximized, measure the gap between window and viewport, then
// correct for it. The button is honoured in terms of the viewport, which is what
// a breakpoint is actually measured against.
function setTabWidth(targetViewport) {
  chrome.windows.getCurrent({}, function (win) {
    if (chrome.runtime.lastError || !win) return;

    const applyWidth = (w) => chrome.windows.update(win.id, { width: Math.round(w), focused: true });

    const resize = () => {
      sendMessageToTab({ action: 'getBreakpoint' }).then(response => {
        const viewport = response && response.breakpoint && response.breakpoint.width;
        // The difference between the window and the viewport it contains stays
        // constant across a resize, so one measurement is enough to correct by.
        const chromeWidth = (viewport && win.width) ? Math.max(0, win.width - viewport) : 0;
        applyWidth(targetViewport + chromeWidth);
        reportWidthOutcome(targetViewport, chromeWidth);
      }).catch(() => {
        applyWidth(targetViewport);
      });
    };

    if (win.state === 'maximized' || win.state === 'fullscreen') {
      chrome.windows.update(win.id, { state: 'normal' }, () => resize());
    } else {
      resize();
    }
  });
}

// Says so when the OS refuses to make the window narrow enough, rather than
// leaving a button that silently does nothing.
function reportWidthOutcome(targetViewport, chromeWidth) {
  setTimeout(() => {
    sendMessageToTab({ action: 'getBreakpoint' }).then(response => {
      const actual = response && response.breakpoint && response.breakpoint.width;
      if (!actual) return;
      if (Math.abs(actual - targetViewport) <= 2) {
        showStatus('Viewport now ' + actual + 'px');
      } else {
        showStatus('Narrowest this window goes is ' + actual + 'px', 'error');
      }
      updateCurrentBreakpoint();
    }).catch(() => {});
  }, 220);
}

function toggleGrid() {
  sendMessageToTab({ action: 'toggleGrid' }).then(response => {
    if (response) {
      isGridVisible = response.visible;
      gridAvailable = response.available !== false;
      updateGridToggleButton();
    }
  }).catch(err => {
    showStatus('Could not toggle grid', 'error');
  });
}

function updateGridToggleButton(reason) {
  const button = document.getElementById('toggleGrid');
  // The icon no longer needs touching here - both states are in the DOM and
  // CSS reveals the right one from the button's .active class.
  const text = document.getElementById('toggleGridText');
  const note = document.getElementById('grid-note');

  if (isGridVisible) {
    button.classList.add('active');
    text.textContent = 'Hide Grid';
  } else {
    button.classList.remove('active');
    text.textContent = 'Show Grid';
  }

  // The overlay only draws where a Bootstrap grid exists, so the control is
  // disabled rather than silently doing nothing - and says why.
  button.disabled = !gridAvailable;

  if (gridAvailable) {
    button.title = '';
    note.hidden = true;
    note.textContent = '';
  } else if (reason === 'unsupported') {
    button.title = 'GridLens cannot run on this page';
    note.textContent = 'Not available here. Browser pages, the extension gallery and PDFs are off limits to every extension.';
    note.hidden = false;
  } else {
    button.title = 'No Bootstrap detected on this page';
    note.textContent = 'No Bootstrap found on this page, so there is no grid to overlay. Set the version manually in the Tooltips tab to draw one anyway.';
    note.hidden = false;
  }
}

function updateCurrentBreakpoint() {
  sendMessageToTab({ action: 'getBreakpoint' }).then(response => {
    if (response && response.breakpoint) {
      document.getElementById('bp-name').textContent = response.breakpoint.name.toUpperCase();
      document.getElementById('bp-width').textContent = response.breakpoint.width + 'px';
    }
  }).catch(() => {
    // No content script here. Say which pages that means rather than leaving
    // a dash and letting the user wonder whether it is broken.
    document.getElementById('bp-name').textContent = 'N/A';
    document.getElementById('bp-width').textContent = '—';
  });
}

function updateGridColor(e) {
  gridColor = e.target.value;
  saveSync({ gridColor }, () => {
    sendMessageToTab({ action: 'updateColor', color: gridColor });
    showStatus('Grid color updated!');
  });
}

function resetGridColor() {
  gridColor = '#ff0000';
  document.getElementById('gridColor').value = gridColor;
  saveSync({ gridColor }, () => {
    sendMessageToTab({ action: 'updateColor', color: gridColor });
    showStatus('Color reset to red');
  });
}

function cloneDefaults() {
  return DEFAULT_BREAKPOINTS.map(bp => ({ name: bp.name, minWidth: bp.minWidth }));
}

// Sorted view used for derived ranges. Rows keep their entry order while you
// type; sorting happens on commit so the cursor never jumps mid-edit.
function sortedBreakpoints() {
  return customBreakpoints
    .map((bp, i) => ({ ...bp, i }))
    .sort((a, b) => a.minWidth - b.minWidth);
}

function rangeLabel(bp) {
  const order = sortedBreakpoints();
  const pos = order.findIndex(o => o.i === bp.i);
  const next = order[pos + 1];
  const upper = next ? next.minWidth - 1 : null;
  if (upper !== null && upper < bp.minWidth) return 'never matches';
  return bp.minWidth + ' – ' + (upper === null ? '∞' : upper);
}

// Problems block saving. Notes are advisory - a set can be unusual without
// being wrong, and refusing to save it would just be in the way.
function inspectBreakpoints() {
  const problems = [];
  const notes = [];
  const names = new Map();
  const starts = new Map();

  customBreakpoints.forEach((bp, i) => {
    const name = (bp.name || '').trim();
    if (!name) problems.push({ i, msg: 'Row ' + (i + 1) + ' has no name.' });
    else names.set(name.toLowerCase(), (names.get(name.toLowerCase()) || 0) + 1);

    if (!Number.isFinite(bp.minWidth) || bp.minWidth < 0) {
      problems.push({ i, msg: 'Row ' + (i + 1) + ' needs a start width of 0 or more.' });
    } else {
      starts.set(bp.minWidth, (starts.get(bp.minWidth) || 0) + 1);
    }
  });

  names.forEach((count, name) => {
    if (count > 1) problems.push({ msg: 'The name "' + name + '" is used ' + count + ' times.' });
  });
  starts.forEach((count, px) => {
    if (count > 1) problems.push({ msg: 'Two breakpoints both start at ' + px + 'px.' });
  });

  if (!customBreakpoints.length) problems.push({ msg: 'Add at least one breakpoint.' });

  const order = sortedBreakpoints();
  if (order.length && order[0].minWidth !== 0) {
    notes.push('Nothing covers widths below ' + order[0].minWidth + 'px. Start your first breakpoint at 0 to cover them.');
  }

  return { problems, notes };
}

function renderIssues() {
  const box = document.getElementById('bp-issues');
  const { problems, notes } = inspectBreakpoints();
  const all = problems.map(p => p.msg).concat(notes);

  box.replaceChildren();
  if (!all.length) { box.hidden = true; return; }

  all.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    box.appendChild(li);
  });
  box.classList.toggle('notes-only', problems.length === 0);
  box.hidden = false;

  const invalid = new Set(problems.map(p => p.i).filter(i => i !== undefined));
  document.querySelectorAll('.breakpoint-item').forEach((row, i) => {
    row.classList.toggle('bp-row-invalid', invalid.has(i));
  });
}

function makeInput(type, placeholder, value, index, field) {
  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;
  input.dataset.index = String(index);
  input.dataset.field = field;
  if (type === 'number') { input.min = '0'; input.step = '1'; }
  return input;
}

function renderBreakpoints() {
  const container = document.getElementById('breakpointsList');
  container.replaceChildren();

  const order = sortedBreakpoints();

  customBreakpoints.forEach((bp, index) => {
    const row = document.createElement('div');
    row.className = 'breakpoint-item';

    // Built with createElement rather than an innerHTML template: names are
    // user-supplied and this is a privileged extension page.
    row.appendChild(makeInput('text', 'name', bp.name, index, 'name'));
    row.appendChild(makeInput('number', 'px', bp.minWidth, index, 'minWidth'));

    const range = document.createElement('span');
    range.className = 'bp-range';
    range.textContent = rangeLabel(order.find(o => o.i === index) || { ...bp, i: index });
    row.appendChild(range);

    const remove = document.createElement('button');
    remove.className = 'bp-remove';
    remove.textContent = '×';
    remove.title = 'Remove this breakpoint';
    remove.setAttribute('aria-label', 'Remove breakpoint ' + (bp.name || index + 1));
    remove.dataset.index = String(index);
    remove.disabled = customBreakpoints.length <= 1;
    row.appendChild(remove);

    container.appendChild(row);
  });

  container.querySelectorAll('input').forEach(input => {
    // `input` keeps typing responsive; `change` (blur or Enter) is the commit
    // point where rows re-sort, so the cursor never jumps out from under you.
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      const field = e.target.dataset.field;
      if (field === 'name') {
        customBreakpoints[index].name = e.target.value;
      } else {
        const raw = e.target.value.trim();
        // An emptied start width means 0, not a sentinel. The old editor turned
        // it into 9999, silently creating a breakpoint that could never match.
        const value = raw === '' ? 0 : parseInt(raw, 10);
        customBreakpoints[index].minWidth = Number.isFinite(value) ? value : NaN;
      }
      updateRanges();
      renderIssues();
      refreshJson();
    });

    input.addEventListener('change', () => {
      const before = customBreakpoints.map(b => b.name + ':' + b.minWidth).join('|');
      customBreakpoints.sort((a, b) => a.minWidth - b.minWidth);
      if (customBreakpoints.map(b => b.name + ':' + b.minWidth).join('|') !== before) {
        renderBreakpoints();
      }
      renderIssues();
      refreshJson();
    });
  });

  container.querySelectorAll('.bp-remove').forEach(button => {
    button.addEventListener('click', (e) => {
      customBreakpoints.splice(parseInt(e.currentTarget.dataset.index, 10), 1);
      renderBreakpoints();
      renderIssues();
      refreshJson();
    });
  });

  renderIssues();
}

function updateRanges() {
  const order = sortedBreakpoints();
  document.querySelectorAll('.breakpoint-item').forEach((row, index) => {
    const cell = row.querySelector('.bp-range');
    const entry = order.find(o => o.i === index);
    if (cell && entry) cell.textContent = rangeLabel(entry);
  });
}

function addBreakpoint() {
  const widest = customBreakpoints.reduce((m, b) => Math.max(m, b.minWidth || 0), 0);
  customBreakpoints.push({ name: '', minWidth: widest ? widest + 200 : 0 });
  renderBreakpoints();
  refreshJson();
  const rows = document.querySelectorAll('.breakpoint-item input[data-field="name"]');
  if (rows.length) rows[rows.length - 1].focus();
}

function saveBreakpoints() {
  const { problems } = inspectBreakpoints();
  if (problems.length) {
    renderIssues();
    showStatus(problems.length === 1 ? problems[0].msg : 'Fix the highlighted rows first', 'error');
    return;
  }

  customBreakpoints = customBreakpoints
    .map(bp => ({ name: bp.name.trim(), minWidth: bp.minWidth }))
    .sort((a, b) => a.minWidth - b.minWidth);

  saveSync({ customBreakpoints }, () => {
    renderBreakpoints();
    refreshJson();
    sendMessageToTab({ action: 'updateBreakpoints', breakpoints: customBreakpoints }).catch(() => {});
    showStatus('Breakpoints saved');
  });
}

function resetBreakpoints() {
  customBreakpoints = cloneDefaults();
  // Storing an empty set means "no override", so the content script falls back
  // to its own defaults rather than to a copy that could drift from them.
  saveSync({ customBreakpoints: [] }, () => {
    renderBreakpoints();
    refreshJson();
    sendMessageToTab({ action: 'updateBreakpoints', breakpoints: [] }).catch(() => {});
    showStatus('Back to Bootstrap defaults');
  });
}

// ===== IMPORT / EXPORT =====

const BP_FILE_TAG = 'gridlens-breakpoints';

function breakpointsToJson() {
  return JSON.stringify({
    format: BP_FILE_TAG,
    version: 1,
    breakpoints: customBreakpoints.map(bp => ({ name: bp.name, minWidth: bp.minWidth }))
  }, null, 2);
}

function refreshJson() {
  const box = document.getElementById('bp-json');
  if (box && document.activeElement !== box) box.value = breakpointsToJson();
}

function ioStatus(message, kind) {
  const el = document.getElementById('bp-io-status');
  if (!el) return;
  el.textContent = message;
  el.className = 'bp-io-status' + (kind ? ' is-' + kind : '');
  el.hidden = !message;
}

// Deliberately generous about shape. A set might arrive as our own export, a
// bare array, or the name-to-width object that mirrors Bootstrap's Sass map -
// all three are unambiguous, so all three are accepted.
function parseBreakpointsPayload(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("That isn't valid JSON.");
  }

  let list;
  if (Array.isArray(data)) {
    list = data;
  } else if (data && Array.isArray(data.breakpoints)) {
    list = data.breakpoints;
  } else if (data && typeof data === 'object') {
    list = Object.keys(data)
      .filter(k => typeof data[k] === 'number')
      .map(k => ({ name: k, minWidth: data[k] }));
    if (!list.length) throw new Error('No breakpoints found in there.');
  } else {
    throw new Error('No breakpoints found in there.');
  }

  const parsed = list
    .map(bp => {
      if (!bp || typeof bp !== 'object') return null;
      const name = String(bp.name === undefined ? '' : bp.name).trim();
      // minWidth is the field; min and width are accepted as friendly aliases.
      const raw = bp.minWidth !== undefined ? bp.minWidth
                : bp.min !== undefined ? bp.min
                : bp.width;
      const minWidth = parseInt(raw, 10);
      if (!name || !Number.isFinite(minWidth) || minWidth < 0) return null;
      return { name, minWidth };
    })
    .filter(Boolean)
    .sort((a, b) => a.minWidth - b.minWidth);

  if (!parsed.length) throw new Error('No usable breakpoints in there — each needs a name and a start width.');
  return parsed;
}

function applyJson() {
  const box = document.getElementById('bp-json');
  try {
    const parsed = parseBreakpointsPayload(box.value);
    customBreakpoints = parsed;
    renderBreakpoints();
    box.value = breakpointsToJson();
    ioStatus('Loaded ' + parsed.length + ' breakpoints. Hit Save to apply them.', 'ok');
  } catch (err) {
    ioStatus(err.message, 'error');
  }
}

function copyJson() {
  const text = document.getElementById('bp-json').value;
  navigator.clipboard.writeText(text)
    .then(() => ioStatus('Copied to the clipboard.', 'ok'))
    .catch(() => ioStatus('Could not copy — select the text and copy manually.', 'error'));
}

function downloadJson() {
  const blob = new Blob([breakpointsToJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gridlens-breakpoints.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  ioStatus('Saved gridlens-breakpoints.json.', 'ok');
}

function loadFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('bp-json').value = String(reader.result || '');
    applyJson();
  };
  reader.onerror = () => ioStatus('Could not read that file.', 'error');
  reader.readAsText(file);
}

function setupBreakpointIO() {
  document.getElementById('bpApply').addEventListener('click', applyJson);
  document.getElementById('bpCopy').addEventListener('click', copyJson);
  document.getElementById('bpDownload').addEventListener('click', downloadJson);

  const file = document.getElementById('bpFile');
  document.getElementById('bpPickFile').addEventListener('click', () => file.click());
  file.addEventListener('change', (e) => {
    loadFromFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  });

  refreshJson();
}

// ===== TOOLTIPS PANEL =====
function setupTooltipsPanel() {
  document.getElementById('toggleTooltips').addEventListener('click', toggleTooltips);
  document.getElementById('version-select').addEventListener('change', (e) => {
    const version = e.target.value;
    saveSync({ bootstrapVersion: version });
    sendMessageToTab({ action: 'setVersion', version }).then(() => {
      updateTooltipStatus();
      // An override can make the grid available on a page where nothing was
      // detected, or withdraw it again.
      loadTabGridState();
    }).catch(() => {});
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
      statusEl.classList.add('is-on');
      text.textContent = 'Hide All Tooltips';
      btn.classList.add('active');
    } else {
      statusEl.textContent = 'Hidden';
      statusEl.classList.remove('is-on');
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
