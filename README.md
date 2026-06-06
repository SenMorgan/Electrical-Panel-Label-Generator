# Electrical Panel Label Generator

Static DIN rail breaker label generator built for GitHub Pages and local file hosting.

## Features

- One-row breaker strip with configurable slot count, cell width, and cell height.
- Exact millimeter sizing for print output on A4 landscape sheets.
- Multi-select editing with Shift/Ctrl selection, contiguous merge, and split support.
- Tom Select powered Material Design Icons picker with live previews and fast search by icon name.
- JSON export and import for sharing configurations.
- Debounced localStorage persistence with separate storage for preferences (print warning toggle) and layout data.
- UI preferences (show/hide cell index, icons, text, grid lines) persisted across sessions.
-
## Usage

1. Open [index.html](index.html) directly in a browser, or host the repository with GitHub Pages.
2. Adjust breaker count and cell dimensions in millimeters.
3. Click a cell or use the side panel to edit the label text and icon.
4. Use Shift+click for a range or Ctrl/Cmd+click to build a multi-selection, then merge contiguous free labels from the side panel.
5. Press Delete to clear all selected cells content.
6. Use the toggles to show/hide cell indices, icons, text, and grid lines in the preview.
7. Export the layout as JSON to share or save, and import JSON to load a saved configuration.
8. Press the print button to open the print dialog. Remember to select A4 landscape, set scale to 100%, and disable headers/footers for best results. A print warning toggle can be set in preferences to show or hide the print instructions before printing.

## Notes

- Bootstrap 5.3 and the Material Design Icons font are loaded via CDN.
- Tom Select is loaded via CDN for the icon selector.
- The icon picker loads the full MDI catalog at runtime from the published MDI stylesheet so there is no build step.
- Core behavior is implemented in plain browser JavaScript with no build step.

## Privacy

- This app does not use cookies for tracking or advertising.
- It stores layout data and UI preferences locally in the browser using `localStorage`.
- The app loads third-party assets from jsDelivr, including Bootstrap, Material Design Icons, and Tom Select. Those requests may expose standard technical data such as the visitor IP address to that provider.