const STORAGE_KEY = "din-rail-label-generator-state";

import { normalizeIconName } from "./icons.js";
import { showError } from "./logger.js";

export const DEFAULT_BADGE_COLOR = "#43a047";
export const BADGE_COLOR_PRESETS = [
    { value: "#43a047", label: "Green" },
    { value: "#fdd835", label: "Yellow" },
    { value: "#fb8c00", label: "Orange" },
    { value: "#e53935", label: "Red" },
    { value: "#8e24aa", label: "Purple" },
    { value: "#3949ab", label: "Indigo" },
    { value: "#1e88e5", label: "Blue" },
    { value: "#00acc1", label: "Cyan" },
    { value: "#00897b", label: "Teal" },
    { value: "#6d4c41", label: "Brown" },
    { value: "#546e7a", label: "Blue Grey" }
];

export const DEFAULT_STATE = {
    config: {
        slotCount: 10,
        cellWidth: 18,
        cellHeight: 30
    },
    layout: {
        hideCellIndex: false,
        hideCellIcon: false,
        hideCellText: false
    },
    preferences: {
        showPrintWarning: true
    },
    selectedIndices: [],
    labels: []
};

export function cloneState(value) {
    return structuredClone(value);
}

export function loadState() {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        return normalizeState(cloneState(DEFAULT_STATE));
    }

    try {
        const normalized = normalizeState(JSON.parse(stored));
        normalized.selectedIndices = [];
        return normalized;
    } catch (error) {
        showError("Failed to restore saved layout, reverting to default.", error);
        return normalizeState(cloneState(DEFAULT_STATE));
    }
}

export function saveState(state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createPersistedState(state)));
}

export function createPersistedState(state) {
    const normalized = normalizeState(state);

    return {
        config: normalized.config,
        layout: normalized.layout,
        preferences: normalized.preferences,
        labels: normalized.labels
    };
}

export function createExportState(state) {
    const normalized = normalizeState(state);

    return {
        config: normalized.config,
        layout: normalized.layout,
        labels: normalized.labels
    };
}

export function normalizeState(inputState) {
    const normalized = {
        config: {
            slotCount: clampInt(inputState?.config?.slotCount, 14, 1, 42),
            cellWidth: clampNumber(inputState?.config?.cellWidth, 18, 8, 50),
            cellHeight: clampNumber(inputState?.config?.cellHeight, 30, 10, 60)
        },
        layout: {
            hideCellIndex: Boolean(inputState?.layout?.hideCellIndex),
            hideCellIcon: Boolean(inputState?.layout?.hideCellIcon),
            hideCellText: Boolean(inputState?.layout?.hideCellText)
        },
        preferences: {
            showPrintWarning: inputState?.preferences?.showPrintWarning !== false
        },
        selectedIndices: Array.isArray(inputState?.selectedIndices)
            ? inputState.selectedIndices
            : [inputState?.selectedIndex ?? 0],
        labels: Array.isArray(inputState?.labels) ? inputState.labels : []
    };

    normalized.labels = Array.from({ length: normalized.config.slotCount }, (_, index) => {
        const source = normalized.labels[index] || {};
        return {
            text: typeof source.text === "string" ? source.text : "",
            icon: typeof source.icon === "string" ? normalizeIconName(source.icon) : "",
            badgeColor: normalizeHexColor(source.badgeColor, DEFAULT_BADGE_COLOR),
            span: clampInt(source.span, 1, 1, normalized.config.slotCount),
            covered: Boolean(source.covered)
        };
    });

    repairSpans(normalized.labels);
    normalized.selectedIndices = normalizeSelection(normalized.labels, normalized.selectedIndices);

    return normalized;
}

export function repairSpans(labels) {
    labels.forEach((label) => {
        label.span = Math.max(1, Number.parseInt(label.span, 10) || 1);
        label.covered = false;
    });

    for (let index = 0; index < labels.length; index += 1) {
        const label = labels[index];

        if (label.covered) {
            label.span = 1;
            continue;
        }

        label.span = Math.min(label.span, labels.length - index);

        for (let offset = 1; offset < label.span; offset += 1) {
            labels[index + offset].covered = true;
            labels[index + offset].span = 1;
        }
    }
}

export function findOwnerIndex(labels, index) {
    for (let cursor = index; cursor >= 0; cursor -= 1) {
        if (labels[cursor].span > 1 && cursor + labels[cursor].span - 1 >= index) {
            return cursor;
        }

        if (!labels[cursor].covered) {
            return cursor;
        }
    }

    return 0;
}

export function normalizeSelection(labels, selection) {
    const maxIndex = Math.max(0, labels.length - 1);
    const requested = Array.isArray(selection) ? selection : [selection];
    const normalized = Array.from(new Set(requested
        .map((value) => clampInt(value, 0, 0, maxIndex))
        .filter((value) => labels[value])
        .map((value) => (labels[value].covered ? findOwnerIndex(labels, value) : value))
        .filter((value) => labels[value] && !labels[value].covered)))
        .sort((left, right) => left - right);

    return normalized;
}

export function canMergeSelection(labels, selection) {
    const normalized = normalizeSelection(labels, selection);

    if (normalized.length < 2) {
        return false;
    }

    return normalized.every((index, offset) => {
        const label = labels[index];
        return Boolean(label && !label.covered && label.span === 1 && index === normalized[0] + offset);
    });
}

export function mergeSelection(labels, selection) {
    if (!canMergeSelection(labels, selection)) {
        return false;
    }

    const normalized = normalizeSelection(labels, selection);
    labels[normalized[0]].span = normalized.length;
    repairSpans(labels);
    return true;
}

export function canSplitSelection(labels, selection) {
    const normalized = normalizeSelection(labels, selection);
    return normalized.length === 1 && labels[normalized[0]]?.span > 1;
}

export function splitSelection(labels, selection) {
    if (!canSplitSelection(labels, selection)) {
        return false;
    }

    const [index] = normalizeSelection(labels, selection);
    labels[index].span = 1;
    repairSpans(labels);
    return true;
}

export function normalizeHexColor(value, fallback = DEFAULT_BADGE_COLOR) {
    if (typeof value !== "string") {
        return fallback;
    }

    const trimmed = value.trim();

    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
        return fallback;
    }

    if (trimmed.length === 4) {
        return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
    }

    return trimmed.toLowerCase();
}

function clampInt(value, fallback, min, max) {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
}

function clampNumber(value, fallback, min, max) {
    const parsed = Number.parseFloat(value);

    if (Number.isNaN(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
}

export function hasStoredState() {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
}

export function isLayoutEmpty(state) {
    const normalized = normalizeState(state);

    if (normalized.config.slotCount !== DEFAULT_STATE.config.slotCount
        || normalized.config.cellWidth !== DEFAULT_STATE.config.cellWidth
        || normalized.config.cellHeight !== DEFAULT_STATE.config.cellHeight) {
        return false;
    }

    return normalized.labels.every((label) => label.text === ""
        && label.icon === ""
        && label.badgeColor === DEFAULT_BADGE_COLOR
        && label.span === 1
        && !label.covered);
}