import {
    DEFAULT_ICON_NAME,
    loadIconCatalog,
    normalizeIconName
} from "./js/icons.js";
import {
    BADGE_COLOR_PRESETS,
    DEFAULT_BADGE_COLOR,
    DEFAULT_STATE,
    canMergeSelection,
    canSplitSelection,
    cloneState,
    findOwnerIndex,
    hasStoredState,
    isLayoutEmpty,
    loadState,
    mergeSelection,
    normalizeHexColor,
    normalizeSelection,
    normalizeState,
    saveState
} from "./js/state.js";
import {
    placeCaretAtEnd,
    renderApp,
    updateCellText
} from "./js/ui.js";

const dom = {
    slotCountInput: document.querySelector("#slotCountInput"),
    cellWidthInput: document.querySelector("#cellWidthInput"),
    cellHeightInput: document.querySelector("#cellHeightInput"),
    exportBtn: document.querySelector("#exportBtn"),
    importBtn: document.querySelector("#importBtn"),
    importFileInput: document.querySelector("#importFileInput"),
    loadDemoBtn: document.querySelector("#loadDemoBtn"),
    resetBtn: document.querySelector("#resetBtn"),
    previewBtn: document.querySelector("#previewBtn"),
    previewBar: document.querySelector("#previewBar"),
    printWarningDialog: document.querySelector("#printWarningDialog"),
    disablePrintWarningCheckbox: document.querySelector("#disablePrintWarningCheckbox"),
    previewPrintBtn: document.querySelector("#previewPrintBtn"),
    closePreviewBtn: document.querySelector("#closePreviewBtn"),
    printBtn: document.querySelector("#printBtn"),
    selectedMeta: document.querySelector("#selectedMeta"),
    selectedIconInput: document.querySelector("#selectedIconInput"),
    selectedTextInput: document.querySelector("#selectedTextInput"),
    selectedBadgeColorPreset: document.querySelector("#selectedBadgeColorPreset"),
    selectedBadgeColorHex: document.querySelector("#selectedBadgeColorHex"),
    selectedBadgeColorChip: document.querySelector("#selectedBadgeColorChip"),
    mergeToggleBtn: document.querySelector("#mergeToggleBtn"),
    layoutStatus: document.querySelector("#layoutStatus"),
    paperSheet: document.querySelector("#paperSheet"),
    labelStrip: document.querySelector("#labelStrip"),
    cellTemplate: document.querySelector("#cellTemplate"),
    toastNotice: document.querySelector("#toastNotice"),
    toastNoticeBody: document.querySelector("#toastNoticeBody"),
    footerYear: document.querySelector("#footerYear")
};

let state = loadState();
let saveTimerId = 0;
let allIcons = [];
let iconPicker = null;
let syncingIconPicker = false;
let selectionAnchorIndex = getSelectionAnchorIndex();
let pendingSelectionGesture = null;
let toast = null;

void init();

async function init() {
    initBadgeColorPresets();
    initToast();
    dom.footerYear.textContent = String(new Date().getFullYear());
    bindEvents();
    initIconPicker();
    render();

    if (!hasStoredState()) {
        await loadDemoLayout({
            skipConfirm: true,
            notice: "Demo layout loaded. Start editing or reset to begin with a blank strip."
        });
    }

    try {
        allIcons = await loadIconCatalog();
        setIconOptions(allIcons);
        render();
    } catch {
        setIconOptions([
            {
                value: DEFAULT_ICON_NAME,
                label: "No icon",
                className: "",
                searchText: "none no icon empty clear"
            }
        ]);
        dom.layoutStatus.textContent = "Unable to load the full MDI icon catalog. Label editing and printing still work.";
    }
}

function bindEvents() {
    dom.slotCountInput.addEventListener("change", handleConfigChange);
    dom.cellWidthInput.addEventListener("change", handleConfigChange);
    dom.cellHeightInput.addEventListener("change", handleConfigChange);
    document.addEventListener("keydown", handleDocumentKeydown);

    dom.selectedTextInput.addEventListener("input", (event) => {
        applyToSelected((label) => {
            label.text = event.target.value;
        });
        state.selectedIndices.forEach((index) => {
            updateCellText(dom.labelStrip, index, event.target.value);
        });
        queueSave();
    });

    dom.selectedBadgeColorPreset.addEventListener("change", () => {
        if (dom.selectedBadgeColorPreset.value) {
            setSelectedBadgeColor(dom.selectedBadgeColorPreset.value);
        }
    });

    dom.selectedBadgeColorHex.addEventListener("input", (event) => {
        event.target.value = event.target.value.toUpperCase();
        if (/^#(?:[0-9A-F]{3}|[0-9A-F]{6})$/.test(event.target.value)) {
            setSelectedBadgeColor(event.target.value);
        }
    });

    dom.selectedBadgeColorHex.addEventListener("change", (event) => {
        const normalized = normalizeHexColor(event.target.value);
        event.target.value = normalized.toUpperCase();
        setSelectedBadgeColor(normalized);
    });

    dom.selectedIconInput.addEventListener("change", () => {
        handleIconChange(dom.selectedIconInput.value || DEFAULT_ICON_NAME);
    });

    dom.mergeToggleBtn.addEventListener("click", () => {
        handleMergeAction();
    });

    dom.exportBtn.addEventListener("click", exportState);
    dom.importBtn.addEventListener("click", () => dom.importFileInput.click());
    dom.importFileInput.addEventListener("change", importState);
    dom.loadDemoBtn.addEventListener("click", () => {
        void loadDemoLayout();
    });
    dom.resetBtn.addEventListener("click", resetState);
    dom.previewBtn.addEventListener("click", () => {
        setPreviewMode(true);
    });
    dom.closePreviewBtn.addEventListener("click", () => {
        setPreviewMode(false);
    });
    dom.previewPrintBtn.addEventListener("click", handlePrintRequest);
    dom.printBtn.addEventListener("click", handlePrintRequest);

    if (dom.printWarningDialog) {
        dom.printWarningDialog.addEventListener("close", handlePrintWarningClose);
        dom.printWarningDialog.addEventListener("cancel", () => {
            dom.disablePrintWarningCheckbox.checked = false;
        });
    }

    dom.labelStrip.addEventListener("mousedown", (event) => {
        const cell = event.target.closest("[data-index]");

        pendingSelectionGesture = cell
            ? {
                extend: event.shiftKey,
                toggle: event.ctrlKey || event.metaKey
            }
            : null;
    });

    dom.labelStrip.addEventListener("click", (event) => {
        const cell = event.target.closest("[data-index]");

        if (!cell) {
            return;
        }

        selectCell(Number(cell.dataset.index), {
            extend: event.shiftKey,
            toggle: event.ctrlKey || event.metaKey,
            focusText: !(event.shiftKey || event.ctrlKey || event.metaKey)
        });
        pendingSelectionGesture = null;
    });

    dom.labelStrip.addEventListener("input", (event) => {
        const textElement = event.target.closest(".cell-text");

        if (!textElement) {
            return;
        }

        const cell = textElement.closest("[data-index]");
        const index = Number(cell.dataset.index);
        state.labels[index].text = textElement.textContent.replace(/\n{3,}/g, "\n\n").trim();

        if (state.selectedIndices.length === 1 && state.selectedIndices[0] === index) {
            dom.selectedTextInput.value = state.labels[index].text;
        }

        queueSave();
    });

    dom.labelStrip.addEventListener("focusin", (event) => {
        const cell = event.target.closest("[data-index]");

        if (cell && !(pendingSelectionGesture?.extend || pendingSelectionGesture?.toggle)) {
            selectCell(Number(cell.dataset.index), { focusText: false });
        }
    });
}

function render() {
    renderApp(dom, state);
    syncIconPickerValue();
}

function setPreviewMode(isPreviewing) {
    document.body.classList.toggle("preview-print", isPreviewing);
    dom.previewBar.hidden = !isPreviewing;
}

function handlePrintRequest() {
    if (!state.preferences.showPrintWarning) {
        window.print();
        return;
    }

    if (typeof dom.printWarningDialog?.showModal !== "function") {
        const confirmed = window.confirm("Set printer scale to 100% in the printer settings so the label sizes stay accurate in millimeters.");

        if (confirmed) {
            window.print();
        }

        return;
    }

    dom.disablePrintWarningCheckbox.checked = false;
    dom.printWarningDialog.showModal();
}

function handlePrintWarningClose() {
    const shouldPrint = dom.printWarningDialog.returnValue === "confirm";

    if (!shouldPrint) {
        dom.disablePrintWarningCheckbox.checked = false;
        return;
    }

    const nextShowPrintWarning = !dom.disablePrintWarningCheckbox.checked;

    if (state.preferences.showPrintWarning !== nextShowPrintWarning) {
        state.preferences.showPrintWarning = nextShowPrintWarning;
        queueSave();
    }

    dom.disablePrintWarningCheckbox.checked = false;
    window.print();
}

function initBadgeColorPresets() {
    const options = [
        { value: "", label: "Custom HEX" },
        ...BADGE_COLOR_PRESETS
    ].map((preset) => {
        const option = document.createElement("option");
        option.value = preset.value;
        option.textContent = preset.label;
        return option;
    });

    dom.selectedBadgeColorPreset.replaceChildren(...options);
}

function initToast() {
    if (!dom.toastNotice || typeof window.bootstrap?.Toast !== "function") {
        return;
    }

    toast = window.bootstrap.Toast.getOrCreateInstance(dom.toastNotice, {
        delay: 5000
    });
}

function handleConfigChange() {
    const nextState = {
        ...state,
        config: {
            slotCount: dom.slotCountInput.valueAsNumber,
            cellWidth: dom.cellWidthInput.valueAsNumber,
            cellHeight: dom.cellHeightInput.valueAsNumber
        },
        labels: state.labels.map((label) => ({ ...label }))
    };

    state = normalizeState(nextState);
    selectionAnchorIndex = getSelectionAnchorIndex();
    render();
    queueSave();
}

function handleMergeAction() {
    if (canSplitSelection(state.labels, state.selectedIndices)) {
        const index = state.selectedIndices[0];
        state.labels[index].span = 1;
        state = normalizeState(state);
        state.selectedIndices = [index];
        selectionAnchorIndex = index;
        render();
        queueSave();
        return;
    }

    if (!canMergeSelection(state.labels, state.selectedIndices)) {
        dom.layoutStatus.textContent = "Select two or more adjacent unmerged labels to merge them.";
        return;
    }

    const firstIndex = state.selectedIndices[0];
    mergeSelection(state.labels, state.selectedIndices);
    state.selectedIndices = [firstIndex];
    selectionAnchorIndex = firstIndex;
    render();
    queueSave();
}

function handleDocumentKeydown(event) {
    if (event.key !== "Delete" || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    if (isEditableTarget(event.target)) {
        return;
    }

    clearSelectedCells();
    event.preventDefault();
}

function clearSelectedCells() {
    applyToSelected((label) => {
        label.text = "";
        label.icon = DEFAULT_ICON_NAME;
        label.badgeColor = DEFAULT_BADGE_COLOR;
    });

    render();
    queueSave();
}

function selectCell(index, options = {}) {
    const ownerIndex = state.labels[index]?.covered ? findOwnerIndex(state.labels, index) : index;
    let nextSelection;
    let nextAnchorIndex = selectionAnchorIndex;

    if (options.extend) {
        nextSelection = getVisibleRange(selectionAnchorIndex, ownerIndex);
    } else if (options.toggle) {
        const selected = new Set(state.selectedIndices);

        if (selected.has(ownerIndex) && selected.size > 1) {
            selected.delete(ownerIndex);
        } else {
            selected.add(ownerIndex);
        }

        nextSelection = Array.from(selected);
    } else {
        nextSelection = [ownerIndex];
        nextAnchorIndex = ownerIndex;
    }

    state.selectedIndices = normalizeSelection(state.labels, nextSelection);

    if (!state.selectedIndices.includes(nextAnchorIndex)) {
        nextAnchorIndex = state.selectedIndices[0] ?? 0;
    }

    selectionAnchorIndex = nextAnchorIndex;
    render();

    if (options.focusText !== false && state.selectedIndices.length === 1) {
        const selectedText = dom.labelStrip.querySelector(`[data-index="${state.selectedIndices[0]}"] .cell-text`);

        if (selectedText) {
            placeCaretAtEnd(selectedText);
        }
    }
}

function exportState() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "panel-label-layout.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Layout exported as JSON.");
}

function importState(event) {
    const [file] = event.target.files;

    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            state = normalizeState(JSON.parse(String(reader.result)));
            selectionAnchorIndex = getSelectionAnchorIndex();
            render();
            queueSave();
            showToast(`Imported layout from ${file.name}.`);
        } catch {
            dom.layoutStatus.textContent = "Import failed. Select a valid JSON layout export.";
        }
    };
    reader.readAsText(file);
    event.target.value = "";
}

function resetState() {
    if (!isLayoutEmpty(state)) {
        const confirmed = window.confirm("Are you sure you want to reset the layout? This cannot be undone.");

        if (!confirmed) {
            return;
        }
    }

    state = normalizeState(cloneState(DEFAULT_STATE));
    selectionAnchorIndex = getSelectionAnchorIndex();
    render();
    queueSave();
    showToast("Layout reset to default.");
}

async function loadDemoLayout(options = {}) {
    const { skipConfirm = false, notice = "Demo layout loaded." } = options;

    if (!skipConfirm && !isLayoutEmpty(state)) {
        const confirmed = window.confirm("Load the demo layout? This will overwrite your current layout.");

        if (!confirmed) {
            return false;
        }
    }

    try {
        const response = await fetch("./demo-layout.json", { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`Failed to load demo layout: ${response.status}`);
        }

        state = normalizeState(await response.json());
        selectionAnchorIndex = getSelectionAnchorIndex();
        render();
        queueSave();
        showToast(notice);
        return true;
    } catch {
        dom.layoutStatus.textContent = "Demo layout could not be loaded.";
        return false;
    }
}

function initIconPicker() {
    if (typeof window.TomSelect !== "function") {
        return;
    }

    iconPicker = new window.TomSelect(dom.selectedIconInput, {
        valueField: "value",
        labelField: "label",
        searchField: ["searchText", "label", "value"],
        maxOptions: 250,
        create: false,
        preload: false,
        sortField: [
            { field: "$score" },
            { field: "label" }
        ],
        render: {
            option(data, escape) {
                return `<div class="icon-select-option">${renderIconMarkup(data.className, "dropdown")}<span>${escape(data.label)}</span></div>`;
            },
            item(data, escape) {
                return `<div class="icon-select-item">${renderIconMarkup(data.className, "button")}<span>${escape(data.label)}</span></div>`;
            },
            no_results() {
                return '<div class="no-results">No matching icons</div>';
            }
        },
        onChange(value) {
            if (!syncingIconPicker) {
                handleIconChange(value || DEFAULT_ICON_NAME);
            }
        }
    });
}

function setIconOptions(icons) {
    dom.selectedIconInput.disabled = false;

    if (!iconPicker) {
        const optionElements = icons.map((icon) => {
            const option = document.createElement("option");
            option.value = icon.value;
            option.textContent = icon.label;
            return option;
        });

        dom.selectedIconInput.replaceChildren(...optionElements);
        syncIconPickerValue();
        return;
    }

    syncingIconPicker = true;
    iconPicker.clearOptions();
    iconPicker.addOptions(icons);
    iconPicker.refreshOptions(false);
    syncingIconPicker = false;
    syncIconPickerValue();
}

function syncIconPickerValue() {
    const commonIcon = getCommonSelectedValue("icon");
    const isMixed = commonIcon === null;
    const nextValue = isMixed ? "" : commonIcon || DEFAULT_ICON_NAME;

    if (!iconPicker) {
        if (nextValue) {
            dom.selectedIconInput.value = nextValue;
        }

        return;
    }

    syncingIconPicker = true;
    iconPicker.settings.placeholder = isMixed ? "Mixed icons" : "Choose an icon";

    if (nextValue) {
        iconPicker.setValue(nextValue, true);
    } else {
        iconPicker.clear(true);
    }

    iconPicker.inputState();
    syncingIconPicker = false;
}

function handleIconChange(value) {
    applyToSelected((label) => {
        label.icon = normalizeIconName(value);
    });
    render();
    queueSave();
}

function setSelectedBadgeColor(value) {
    const normalized = normalizeHexColor(value);

    applyToSelected((label) => {
        label.badgeColor = normalized;
    });

    render();
    queueSave();
}

function applyToSelected(callback) {
    state.selectedIndices.forEach((index) => {
        const label = state.labels[index];

        if (label) {
            callback(label, index);
        }
    });
}

function getCommonSelectedValue(fieldName) {
    const labels = state.selectedIndices.map((index) => state.labels[index]).filter(Boolean);

    if (!labels.length) {
        return DEFAULT_ICON_NAME;
    }

    const [firstLabel] = labels;
    return labels.every((label) => label[fieldName] === firstLabel[fieldName])
        ? firstLabel[fieldName]
        : null;
}

function getVisibleRange(startIndex, endIndex) {
    const startOwner = state.labels[startIndex]?.covered ? findOwnerIndex(state.labels, startIndex) : startIndex;
    const endOwner = state.labels[endIndex]?.covered ? findOwnerIndex(state.labels, endIndex) : endIndex;
    const lowerBound = Math.min(startOwner, endOwner);
    const upperBound = Math.max(startOwner, endOwner);

    return state.labels.reduce((indices, label, index) => {
        if (!label.covered && index >= lowerBound && index <= upperBound) {
            indices.push(index);
        }

        return indices;
    }, []);
}

function getSelectionAnchorIndex() {
    return state.selectedIndices[0] ?? 0;
}

function isEditableTarget(target) {
    if (!(target instanceof Element)) {
        return false;
    }

    return Boolean(target.closest("input, textarea, select, [contenteditable='true'], .ts-control, .ts-dropdown"));
}

function renderIconMarkup(className, context) {
    return className
        ? `<span class="icon-preview icon-preview-${context}" aria-hidden="true"><i class="${className}"></i></span>`
        : "";
}

function queueSave() {
    window.clearTimeout(saveTimerId);
    saveTimerId = window.setTimeout(() => {
        saveState(state);
    }, 300);
}

function showToast(message) {
    if (!dom.toastNotice || !dom.toastNoticeBody) {
        return;
    }

    dom.toastNoticeBody.textContent = message;

    if (toast) {
        toast.show();
    }
}