/**
 * Rich text formatting utilities for cell descriptions
 */

export function initRichTextEditor(dom) {
    const editor = dom.selectedTextInput;
    const boldBtn = dom.textBoldBtn ?? document.querySelector("#textBoldBtn");
    const italicBtn = dom.textItalicBtn ?? document.querySelector("#textItalicBtn");
    const underlineBtn = dom.textUnderlineBtn ?? document.querySelector("#textUnderlineBtn");

    if (!boldBtn || !italicBtn || !underlineBtn) {
        console.error("Rich text buttons not found in DOM");
        return;
    }

    // Formatting button handlers
    boldBtn.addEventListener("click", (e) => {
        e.preventDefault();
        document.execCommand("bold", false, null);
        editor.focus();
        updateButtonStates(editor, boldBtn, italicBtn, underlineBtn);
    });

    italicBtn.addEventListener("click", (e) => {
        e.preventDefault();
        document.execCommand("italic", false, null);
        editor.focus();
        updateButtonStates(editor, boldBtn, italicBtn, underlineBtn);
    });

    underlineBtn.addEventListener("click", (e) => {
        e.preventDefault();
        document.execCommand("underline", false, null);
        editor.focus();
        updateButtonStates(editor, boldBtn, italicBtn, underlineBtn);
    });

    // Update button states on selection/cursor movement
    editor.addEventListener("mouseup", () => {
        updateButtonStates(editor, boldBtn, italicBtn, underlineBtn);
    });

    editor.addEventListener("keyup", () => {
        updateButtonStates(editor, boldBtn, italicBtn, underlineBtn);
    });

    // Handle keyboard shortcuts and line breaks
    editor.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
            if (e.key === "b" || e.key === "B") {
                e.preventDefault();
                document.execCommand("bold", false, null);
                updateButtonStates(editor, boldBtn, italicBtn, underlineBtn);
            } else if (e.key === "i" || e.key === "I") {
                e.preventDefault();
                document.execCommand("italic", false, null);
                updateButtonStates(editor, boldBtn, italicBtn, underlineBtn);
            } else if (e.key === "u" || e.key === "U") {
                e.preventDefault();
                document.execCommand("underline", false, null);
                updateButtonStates(editor, boldBtn, italicBtn, underlineBtn);
            }
        } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.execCommand("insertHTML", false, "<br>");
        }
    });

    // Prevent invalid HTML from being pasted
    editor.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        const html = e.clipboardData.getData("text/html");

        // Try to paste as HTML if available, otherwise use plain text
        if (html) {
            const sanitized = sanitizeHtml(html);
            document.execCommand("insertHTML", false, sanitized);
        } else {
            document.execCommand("insertText", false, text);
        }
    });
}

function updateButtonStates(editor, boldBtn, italicBtn, underlineBtn) {
    boldBtn.classList.toggle("active", document.queryCommandState("bold"));
    italicBtn.classList.toggle("active", document.queryCommandState("italic"));
    underlineBtn.classList.toggle("active", document.queryCommandState("underline"));
}

/**
 * Sanitize HTML to only allow basic formatting tags
 */
export function sanitizeHtml(html) {
    if (!html) return "";

    // Create a temporary container
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Remove any script tags and event handlers
    const scripts = temp.querySelectorAll("script");
    scripts.forEach(script => script.remove());

    // Allowed formatting tags
    const allowed = ["b", "i", "u", "strong", "em", "br"];

    // Process elements recursively
    function cleanElement(el) {
        // Get all child elements (in reverse order to safely remove)
        const children = Array.from(el.children);

        for (let child of children) {
            const tagName = child.tagName.toLowerCase();

            if (!allowed.includes(tagName)) {
                // Move children up and remove this element
                while (child.firstChild) {
                    cleanElement(child.firstChild);
                    el.insertBefore(child.firstChild, child);
                }
                el.removeChild(child);
            } else {
                // Remove all attributes from allowed elements
                while (child.attributes.length > 0) {
                    child.removeAttribute(child.attributes[0].name);
                }
                // Recursively clean children
                cleanElement(child);
            }
        }
    }

    cleanElement(temp);

    // Normalize similar tags (strong -> b, em -> i)
    let html_normalized = temp.innerHTML
        .replace(/<strong>/g, "<b>")
        .replace(/<\/strong>/g, "</b>")
        .replace(/<em>/g, "<i>")
        .replace(/<\/em>/g, "</i>");

    return html_normalized;
}

/**
 * Convert plain text to HTML (escaping special characters)
 */
export function plainTextToHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

/**
 * Convert HTML to plain text (for display/export)
 */
export function htmlToPlainText(html) {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
}

/**
 * Get the content as either HTML or plain text
 */
export function getEditorContent(editor, asHtml = true) {
    if (!editor) return "";

    if (asHtml) {
        // Get and sanitize HTML
        const html = editor.innerHTML;
        return sanitizeHtml(html);
    } else {
        // Get plain text version
        return htmlToPlainText(editor.innerHTML).trim();
    }
}

/**
 * Set editor content from HTML or plain text
 */
export function setEditorContent(editor, content) {
    if (!editor) return;

    // Sanitize and set HTML content
    if (content && content.includes("<")) {
        // Looks like HTML, sanitize it
        editor.innerHTML = sanitizeHtml(content);
    } else if (content) {
        // Plain text, escape it
        editor.textContent = content;
    } else {
        // Empty content
        editor.innerHTML = "";
    }
}

/**
 * Clear all formatting from editor
 */
export function clearFormatting(editor) {
    if (!editor) return;

    // Get plain text and set it back
    const text = htmlToPlainText(editor.innerHTML);
    editor.innerHTML = plainTextToHtml(text);
}
