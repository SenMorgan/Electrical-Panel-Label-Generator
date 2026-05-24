const MDI_STYLESHEET_URL = "https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css";

export const DEFAULT_ICON_NAME = "none";

let iconCatalogPromise;

export function normalizeIconName(value) {
    if (typeof value !== "string") {
        return DEFAULT_ICON_NAME;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return DEFAULT_ICON_NAME;
    }

    return trimmedValue.replace(/^mdi-/, "");
}

export function buildIconClassName(iconName) {
    const normalizedName = normalizeIconName(iconName);
    return normalizedName === DEFAULT_ICON_NAME ? "" : `mdi mdi-${normalizedName}`;
}

export function formatIconLabel(iconName) {
    const normalizedName = normalizeIconName(iconName);

    if (normalizedName === DEFAULT_ICON_NAME) {
        return "No icon";
    }

    return normalizedName
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

export function loadIconCatalog() {
    if (!iconCatalogPromise) {
        iconCatalogPromise = fetch(MDI_STYLESHEET_URL)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load MDI catalog: ${response.status}`);
                }

                return response.text();
            })
            .then((cssText) => buildCatalogFromStylesheet(cssText));
    }

    return iconCatalogPromise;
}

function buildCatalogFromStylesheet(cssText) {
    const iconNames = new Set();
    const selectorPattern = /\.mdi-([a-z0-9-]+)::?before/g;
    let match;

    while ((match = selectorPattern.exec(cssText)) !== null) {
        iconNames.add(match[1]);
    }

    const sortedIcons = Array.from(iconNames)
        .sort((left, right) => left.localeCompare(right))
        .map((name) => ({
            value: name,
            label: formatIconLabel(name),
            className: buildIconClassName(name),
            searchText: `${name} ${formatIconLabel(name)}`.toLowerCase()
        }));

    return [
        {
            value: DEFAULT_ICON_NAME,
            label: formatIconLabel(DEFAULT_ICON_NAME),
            className: "",
            searchText: "none no icon empty clear"
        },
        ...sortedIcons
    ];
}