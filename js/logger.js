let _container = null;

const VARIANT_CLASSES = {
    info: ["border", "border-primary", "bg-primary-subtle", "text-primary-emphasis"],
    warning: ["border", "border-warning", "bg-warning-subtle", "text-warning-emphasis"],
    error: ["border", "border-danger", "bg-danger-subtle", "text-danger-emphasis"]
};

export function initLogger(containerEl) {
    _container = containerEl;
}

export function showToast(message, type = "info") {
    if (!_container || typeof window.bootstrap?.Toast !== "function") {
        return;
    }

    const toastEl = document.createElement("div");
    toastEl.className = [
        "toast", "align-items-center", "shadow-sm",
        ...(VARIANT_CLASSES[type] ?? VARIANT_CLASSES.info)
    ].join(" ");
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    toastEl.setAttribute("aria-atomic", "true");

    const body = document.createElement("div");
    body.className = "toast-body";
    body.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn-close me-2 m-auto";
    closeBtn.setAttribute("data-bs-dismiss", "toast");
    closeBtn.setAttribute("aria-label", "Close");

    const inner = document.createElement("div");
    inner.className = "d-flex";
    inner.append(body, closeBtn);
    toastEl.append(inner);

    _container.appendChild(toastEl);

    const toast = window.bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 5000 });
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove(), { once: true });
    toast.show();
}

export function showError(message, cause = null) {
    if (cause) {
        console.error(message, cause);
        showToast(`${message} Check the browser console for details.`, "error");
    } else {
        console.error(message);
        showToast(message, "error");
    }
}

export function showWarning(message) {
    console.warn(message);
    showToast(message, "warning");
}
