# Bootstrap Toolkit

An all-in-one Chrome extension for Bootstrap developers. Combines three powerful tools:

1. **📐 Grid Overlay** - Visualize the Bootstrap 12-column grid
2. **💬 Tooltip Viewer** - Show all tooltips on a page at once
3. **🗔 Modal Opener** - Open any Bootstrap modal by ID

## Features

### Grid Overlay
- Toggle a 12-column grid overlay on any webpage
- See the current Bootstrap breakpoint (xs, sm, md, lg, xl, xxl)
- Customize grid color
- Define custom breakpoints

### Tooltip Viewer
- Show/hide all Bootstrap tooltips at once
- Auto-detect Bootstrap version (3, 4, or 5)
- Manual version override option
- Works with jQuery and vanilla Bootstrap

### Modal Opener
- Open any Bootstrap modal by entering its ID
- See a list of all detected modals on the page
- Click any modal in the list to open it
- Works with Bootstrap 3, 4, and 5

## Installation

### Chrome (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `bootstrap-toolkit` folder

## Usage

1. Click the Bootstrap Toolkit icon in your browser toolbar
2. Use the tabs to switch between Grid, Tooltips, and Modals features
3. Each panel has its own controls and settings

### Grid Panel
- Click "Show Grid" to toggle the grid overlay
- Change the overlay color using the color picker
- Add custom breakpoints in the collapsible section

### Tooltips Panel
- Select Bootstrap version or use auto-detect
- Click "Show All Tooltips" to display all tooltips

### Modals Panel
- Enter a modal ID (with or without #) and click "Open"
- Or click any detected modal in the list to open it
- Click "Refresh List" to rescan for modals

## Compatibility

- Bootstrap 3.x
- Bootstrap 4.x
- Bootstrap 5.x
- Works with jQuery-based and vanilla JS Bootstrap implementations

## Version

1.0.0

## License

MIT License
