/**
 * Creates a Bootstrap modal dynamically and appends it to the document body.
 * @param {string} id - The modal element ID
 * @param {string} title - The modal title (supports HTML with icons)
 * @param {string|HTMLElement} body - The modal body content
 * @param {Array<{text: string, id?: string, class: string, dismiss?: boolean}>} buttons - Array of button configurations
 * @returns {HTMLElement} The created modal element
 */
export function createModal(id, title, body, buttons = []) {
    const modal = document.createElement("div");
    modal.id = id;
    modal.className = "modal fade d-print-none";
    modal.setAttribute("tabindex", "-1");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", `${id}-label`);
    modal.setAttribute("aria-hidden", "true");

    const dialog = document.createElement("div");
    dialog.className = "modal-dialog modal-dialog-centered";

    const content = document.createElement("div");
    content.className = "modal-content print-warning-card";

    // Header
    const header = document.createElement("div");
    header.className = "modal-header border-0";

    const titleEl = document.createElement("h2");
    titleEl.id = `${id}-label`;
    titleEl.className = "modal-title h4";
    titleEl.innerHTML = title;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn-close";
    closeBtn.setAttribute("data-bs-dismiss", "modal");
    closeBtn.setAttribute("aria-label", "Close");

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // Body
    const bodyEl = document.createElement("div");
    bodyEl.className = "modal-body";
    if (typeof body === "string") {
        bodyEl.innerHTML = body;
    } else if (body instanceof HTMLElement) {
        bodyEl.appendChild(body);
    }

    // Footer
    const footer = document.createElement("div");
    footer.className = "modal-footer border-0";

    buttons.forEach((btn) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `btn ${btn.class}`;
        button.textContent = btn.text;

        if (btn.id) {
            button.id = btn.id;
        }

        if (btn.dismiss) {
            button.setAttribute("data-bs-dismiss", "modal");
        }

        footer.appendChild(button);
    });

    content.appendChild(header);
    content.appendChild(bodyEl);
    content.appendChild(footer);
    dialog.appendChild(content);
    modal.appendChild(dialog);

    document.body.appendChild(modal);
    return modal;
}

/**
 * Creates the print warning modal
 * @param {Function} onConfirm - Callback when confirm button is clicked
 * @returns {{element: HTMLElement, confirmBtn: HTMLElement, checkbox: HTMLElement}}
 */
export function createPrintWarningModal(onConfirm) {
    const checkbox = document.createElement("input");
    checkbox.id = "disablePrintWarningCheckbox";
    checkbox.className = "form-check-input";
    checkbox.type = "checkbox";

    const label = document.createElement("label");
    label.className = "form-check";
    label.htmlFor = "disablePrintWarningCheckbox";

    const checkboxLabel = document.createElement("span");
    checkboxLabel.className = "form-check-label";
    checkboxLabel.textContent = "Do not show this warning again";

    label.appendChild(checkbox);
    label.appendChild(checkboxLabel);

    const message = document.createElement("p");
    message.className = "text-secondary mb-3";
    message.textContent = "Set printer scale to 100% in the printer settings so the label sizes stay accurate in millimeters.";

    const body = document.createElement("div");
    body.appendChild(message);
    body.appendChild(label);

    const confirmBtn = {
        text: "Continue to Print",
        id: "printWarningConfirmBtn",
        class: "btn-primary"
    };

    const element = createModal(
        "printWarningDialog",
        '<i class="mdi mdi-alert text-warning me-1"></i>Before printing',
        body,
        [
            { text: "Cancel", class: "btn-outline-secondary", dismiss: true },
            confirmBtn
        ]
    );

    const confirmBtnEl = element.querySelector("#printWarningConfirmBtn");
    confirmBtnEl.addEventListener("click", onConfirm);

    return {
        element,
        confirmBtn: confirmBtnEl,
        checkbox
    };
}

/**
 * Creates the reset confirmation modal
 * @param {Function} onConfirm - Callback when confirm button is clicked
 * @returns {{element: HTMLElement, confirmBtn: HTMLElement}}
 */
export function createResetConfirmModal(onConfirm) {
    const message = document.createElement("p");
    message.className = "text-secondary";
    message.textContent = "Are you sure you want to reset the layout? This cannot be undone.";

    const confirmBtn = {
        text: "Reset",
        id: "resetConfirmBtn",
        class: "btn-danger"
    };

    const element = createModal(
        "resetConfirmDialog",
        '<i class="mdi mdi-alert text-warning me-1"></i>Reset layout',
        message,
        [
            { text: "Cancel", class: "btn-outline-secondary", dismiss: true },
            confirmBtn
        ]
    );

    const confirmBtnEl = element.querySelector("#resetConfirmBtn");
    confirmBtnEl.addEventListener("click", onConfirm);

    return {
        element,
        confirmBtn: confirmBtnEl
    };
}

/**
 * Creates the load demo confirmation modal
 * @param {Function} onConfirm - Callback when confirm button is clicked
 * @returns {{element: HTMLElement, confirmBtn: HTMLElement}}
 */
export function createLoadDemoConfirmModal(onConfirm) {
    const message = document.createElement("p");
    message.className = "text-secondary";
    message.textContent = "Load the demo layout? This will overwrite your current layout.";

    const confirmBtn = {
        text: "Load Demo",
        id: "loadDemoConfirmBtn",
        class: "btn-primary"
    };

    const element = createModal(
        "loadDemoConfirmDialog",
        '<i class="mdi mdi-alert text-warning me-1"></i>Load demo layout',
        message,
        [
            { text: "Cancel", class: "btn-outline-secondary", dismiss: true },
            confirmBtn
        ]
    );

    const confirmBtnEl = element.querySelector("#loadDemoConfirmBtn");
    confirmBtnEl.addEventListener("click", onConfirm);

    return {
        element,
        confirmBtn: confirmBtnEl
    };
}
