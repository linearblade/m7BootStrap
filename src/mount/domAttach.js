/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/**
 * Attach an element to the DOM using a specific strategy.
 *
 * @param {HTMLElement} el - The element to insert.
 * @param {HTMLElement|string|null} target - Target container or CSS selector.
 * @param {string} [method="append"] - One of: "append", "prepend", "before", "after", "replace"
 * @returns {boolean} True if inserted successfully.
 */
export function domAttach(el, target = document.body, method = 'append') {
    if (!(el instanceof HTMLElement)) {
        console.warn('domAttach: invalid element:', el);
        return false;
    }

    const container = typeof target === 'string'
        ? document.querySelector(target)
        : (target || document.body);

    if (!(container instanceof HTMLElement)) {
        console.warn('domAttach: invalid target:', target);
        return false;
    }

    const op = String(method || 'append').toLowerCase();
    switch (op) {
        case 'append':
            container.appendChild(el);
            return true;
        case 'prepend':
            container.insertBefore(el, container.firstChild);
            return true;
        case 'before':
            if (!container.parentNode) return false;
            container.parentNode.insertBefore(el, container);
            return true;
        case 'after':
            if (!container.parentNode) return false;
            container.parentNode.insertBefore(el, container.nextSibling);
            return true;
        case 'replace':
            if (!container.parentNode) return false;
            container.parentNode.replaceChild(el, container);
            return true;
        default:
            console.warn(`domAttach: unsupported method '${method}'`);
            return false;
    }
}


export default domAttach;
