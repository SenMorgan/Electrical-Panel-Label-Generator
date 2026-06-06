import { buildIconClassName, normalizeIconName } from "./icons.js";
import { BADGE_COLOR_PRESETS, canMergeSelection, canSplitSelection } from "./state.js";

export function renderApp(dom, state) {
    syncConfigInputs(dom, state);
    renderStrip(dom, state);
    renderSelectionPanel(dom, state);
    renderStatus(dom, state);
    syncPreferenceCheckboxes(dom, state);
}

export function updateCellText(labelStrip, selectedIndex, text) {
    const selectedText = labelStrip.querySelector(`[data-index="${selectedIndex}"] .cell-text`);

    if (selectedText && selectedText.textContent !== text) {
        selectedText.textContent = text;
    }
}

export function placeCaretAtEnd(element) {
    if (!element?.isConnected) {
        return;
    }

    element.focus();

    window.requestAnimationFrame(() => {
        if (!element.isConnected) {
            return;
        }

        const selection = window.getSelection();

        if (!selection) {
            return;
        }

        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    });
}

function syncPreferenceCheckboxes(dom, state) {
    dom.hideCellIndexCheckbox.checked = Boolean(state.layout.hideCellIndex);
    dom.hideCellIconCheckbox.checked = Boolean(state.layout.hideCellIcon);
    dom.hideCellTextCheckbox.checked = Boolean(state.layout.hideCellText);
    dom.hideCellGridCheckbox.checked = Boolean(state.layout.hideCellGrid);
}

function syncConfigInputs(dom, state) {
    dom.slotCountInput.value = state.config.slotCount;
    dom.cellWidthInput.value = state.config.cellWidth;
    dom.cellHeightInput.value = state.config.cellHeight;
}

function renderStrip(dom, state) {
    dom.labelStrip.replaceChildren();
    dom.labelStrip.classList.toggle("hide-index", Boolean(state.layout.hideCellIndex));
    dom.labelStrip.classList.toggle("hide-icon", Boolean(state.layout.hideCellIcon));
    dom.labelStrip.classList.toggle("hide-text", Boolean(state.layout.hideCellText));
    dom.labelStrip.classList.toggle("hide-grid", Boolean(state.layout.hideCellGrid));
    const selectedIndices = new Set(state.selectedIndices);
    let visibleCellNumber = 0;

    state.labels.forEach((label, index) => {
        if (label.covered) {
            return;
        }

        visibleCellNumber += 1;

        const fragment = dom.cellTemplate.content.cloneNode(true);
        const cell = fragment.querySelector(".label-cell");
        const cellIndex = fragment.querySelector(".cell-index");
        const cellIcon = fragment.querySelector(".cell-icon");
        const cellText = fragment.querySelector(".cell-text");

        cell.dataset.index = String(index);
        cell.style.width = `${state.config.cellWidth * label.span}mm`;
        cell.style.height = `${state.config.cellHeight}mm`;
        cell.style.setProperty("--cell-h", `${state.config.cellHeight}mm`);
        cell.style.setProperty("--cell-badge-color", label.badgeColor);
        cell.classList.toggle("selected", selectedIndices.has(index));
        cellIndex.textContent = String(visibleCellNumber);
        cellIcon.innerHTML = renderIconPreview(label.icon, "cell");
        cellText.textContent = label.text;
        cellText.setAttribute("aria-label", `Label ${visibleCellNumber} description`);
        dom.labelStrip.append(cell);
    });
}

function renderSelectionPanel(dom, state) {
    const selectedLabels = state.selectedIndices.map((index) => state.labels[index]).filter(Boolean);
    const hasSelection = selectedLabels.length > 0;
    const commonText = getCommonValue(selectedLabels, "text");
    const commonBadgeColor = getCommonValue(selectedLabels, "badgeColor");
    const canMerge = canMergeSelection(state.labels, state.selectedIndices);
    const canSplit = canSplitSelection(state.labels, state.selectedIndices);
    const presetMatch = BADGE_COLOR_PRESETS.find((preset) => preset.value === commonBadgeColor);

    dom.selectedMeta.textContent = hasSelection ? describeSelection(state) : "No label selected.";
    dom.selectedTextInput.disabled = !hasSelection || state.layout.hideCellText;
    dom.selectedBadgeColorPreset.disabled = !hasSelection || state.layout.hideCellIndex;
    dom.selectedBadgeColorHex.disabled = !hasSelection || state.layout.hideCellIndex;
    dom.selectedIconInput.disabled = !hasSelection || state.layout.hideCellIcon;

    if (!hasSelection) {
        dom.selectedTextInput.value = "";
        dom.selectedTextInput.placeholder = "Select a label to edit";
        dom.selectedBadgeColorPreset.value = "";
        dom.selectedBadgeColorHex.value = "";
        dom.selectedBadgeColorHex.placeholder = "#43A047";
        dom.selectedBadgeColorChip.style.backgroundColor = "transparent";
        dom.selectedBadgeColorChip.classList.remove("mixed");
        dom.selectedBadgeColorChip.setAttribute("title", "No selection");
        dom.mergeToggleBtn.hidden = true;
        dom.mergeToggleBtn.disabled = true;
        dom.mergeToggleBtn.textContent = "Merge Selected Cells";
        return;
    }

    dom.selectedTextInput.value = commonText ?? "";
    dom.selectedTextInput.placeholder = commonText === null
        ? `Type to update ${selectedLabels.length} labels at once`
        : "Breaker description";
    dom.selectedBadgeColorPreset.value = presetMatch?.value ?? "";
    dom.selectedBadgeColorHex.value = commonBadgeColor ?? "";
    dom.selectedBadgeColorHex.placeholder = commonBadgeColor === null ? "Mixed" : "#43A047";
    dom.selectedBadgeColorChip.style.backgroundColor = commonBadgeColor ?? "transparent";
    dom.selectedBadgeColorChip.classList.toggle("mixed", commonBadgeColor === null);
    dom.selectedBadgeColorChip.setAttribute("title", commonBadgeColor ?? "Mixed colors");
    dom.mergeToggleBtn.hidden = !(canMerge || canSplit);
    dom.mergeToggleBtn.disabled = !(canMerge || canSplit);
    dom.mergeToggleBtn.textContent = canSplit ? "Split Merged Cell" : "Merge Selected Cells";
}

function renderStatus(dom, state) {
    const stripWidth = getStripWidthMm(state);
    const usablePageWidth = 281;
    const fitStatus = stripWidth <= usablePageWidth ? "fits" : "exceeds";

    dom.layoutStatus.textContent = `Strip width ${formatNumber(stripWidth)} mm ${fitStatus} the approx. ${usablePageWidth} mm printable width on A4 landscape.`;
}

function getStripWidthMm(state) {
    return state.labels.reduce((total, label) => {
        if (label.covered) {
            return total;
        }

        return total + state.config.cellWidth * label.span;
    }, 0);
}

function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function describeSelection(state) {
    const { labels, selectedIndices } = state;

    if (!selectedIndices.length) {
        return "No label selected.";
    }

    if (selectedIndices.length === 1) {
        const [index] = selectedIndices;
        const label = labels[index];

        return label.span > 1
            ? `Breaker position ${index + 1} spans ${label.span} positions`
            : `Breaker position ${index + 1}`;
    }

    const firstIndex = selectedIndices[0];
    const lastIndex = selectedIndices[selectedIndices.length - 1];
    const contiguous = selectedIndices.every((index, offset) => index === firstIndex + offset);

    return contiguous
        ? `${selectedIndices.length} labels selected (positions ${firstIndex + 1}-${lastIndex + 1})`
        : `${selectedIndices.length} labels selected`;
}

function getCommonValue(labels, fieldName) {
    if (!labels.length) {
        return "";
    }

    const [firstLabel] = labels;
    return labels.every((label) => label[fieldName] === firstLabel[fieldName])
        ? firstLabel[fieldName]
        : null;
}

function renderIconPreview(iconName, context) {
    const normalizedName = normalizeIconName(iconName);

    if (!normalizedName) {
        return "";
    }

    const className = buildIconClassName(normalizedName);
    return `<span class="icon-preview icon-preview-${context}" aria-hidden="true"><i class="${className}"></i></span>`;
}