# Electrical Panel Label Generator

Static DIN rail breaker label generator built for GitHub Pages and local file hosting.

## Features

- One-row breaker strip with configurable slot count, cell width, and cell height.
- Exact millimeter sizing for print output on A4 landscape sheets.
- Screen preview mode that mirrors the print layout before opening the browser print dialog.
- Inline editing inside each label cell plus a side-panel editor.
- Multi-select editing with Shift/Ctrl selection, contiguous merge, and split support.
- Merge spans can cover any contiguous run of breaker positions while keeping the printed index at the starting slot.
- Tom Select powered Material Design Icons picker with live previews and fast search by icon name.
- Badge-style cell formatting with centered icons and text for cleaner printable output.
- JSON export and import for sharing configurations.
- Debounced localStorage persistence and reset support.
- Print preview mode that hides editing controls while keeping print actions available.

## File layout

- [index.html](index.html) sets up the Bootstrap-based UI shell and app markup.
- [styles.css](styles.css) contains print-safe styling and preview-specific layout rules.
- [app.js](app.js) wires events together and coordinates state updates.
- [js/state.js](js/state.js) handles normalization, merge rules, and persistence.
- [js/ui.js](js/ui.js) renders the strip and the inspector controls.
- [js/icons.js](js/icons.js) stores the Material Design Icon class catalog used by the picker and label cells.

## Usage

1. Open [index.html](index.html) directly in a browser, or host the repository with GitHub Pages.
2. Adjust breaker count and cell dimensions in millimeters.
3. Click a cell or use the side panel to edit the label text and icon.
4. Use Shift+click for a range or Ctrl/Cmd+click to build a multi-selection, then merge contiguous free labels from the side panel.
5. Use Preview to inspect the print layout on screen, then Print for A4-ready output.

## Notes

- Bootstrap 5.3 and the Material Design Icons font are loaded via CDN.
- Tom Select is loaded via CDN for the icon selector.
- The icon picker loads the full MDI catalog at runtime from the published MDI stylesheet so there is no build step.
- Legacy icon alias compatibility has been removed; stored icon names now use direct MDI identifiers.
- Core behavior is still implemented in plain browser JavaScript with no build step.
- Relative paths are GitHub Pages safe.