/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// bootstrap/dom/DomInjector.js
export default class DomInjector {
    constructor(bootstrap) {
	this.bootstrap = bootstrap;
	this.registry = bootstrap.dom;  // optional DomRegistry
    }

    // Resolve a target; string = CSS selector; default to body
    targetOf(selector) {
	if (!selector) return document.body;
	if (selector instanceof Element) return selector;
	return selector
	    ? document.querySelector(selector)
	    : document.body;
    }

    // Create a container element and set attributes
    makeContainer(tag = 'div', attrs = {}) {
	const el = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs || {})) {
	    if (v === true) el.setAttribute(k, '');
	    else if (v !== false && v != null) el.setAttribute(k, String(v));
	}
	return el;
    }

    // Minimal insert primitives
    static insert(el, target, method = 'append') {
	if(!target) return;
	const m = String(method || 'append').toLowerCase();
	switch (m) {
	case 'append':  target.appendChild(el); break;
	case 'prepend': target.insertBefore(el, target.firstChild); break;
	case 'before':  target.parentNode?.insertBefore(el, target); break;
	case 'after':   target.parentNode?.insertBefore(el, target.nextSibling); break;
	case 'replace':
            target.replaceWith(el);
            break;
	default:
            console.warn(`[DomInjector] Unsupported insert method "${method}". Using append.`);
            target.appendChild(el);
	}
    }

    // Convert an asset entry -> element to mount
    // entry = { content: {body, ...}, meta: {...} }
    elementFromAsset(entry, { container = null } = {}) {
	const { content, meta } = entry || {};
	const text = content?.body ?? ''; // HTTP wrapper uses .body
	const type = meta?.type ?? 'text';

	if (type === 'css' || type === 'style') {
	    const el = document.createElement('style');
	    el.textContent = String(text);
	    return el;
	}

	// Default: put raw text/HTML into a container (template by default)
	const tag = container || (type === 'html' ? 'template' : 'template');
	const el = document.createElement(tag);
	// For <template> we should write into its content fragment
	if (el.tagName.toLowerCase() === 'template') {
	    //el.content.append(document.createTextNode(String(text)));
	    el.innerHTML = String(text);
	} else {
	    el.innerHTML = String(text);
	    //el.textContent = String(text);
	}
	return el;
    }

    // dissolve a wrapper if it only has one child
    static maybeDissolve(el, dissolve = false) {
	if (!dissolve) return el;
	const isTemplate = el.tagName?.toLowerCase() === 'template';
	const host = isTemplate ? el.content : el;
	if (host.childNodes.length === 1) {
	    const child = host.firstChild;
	    if (isTemplate) {
		// replace the template with its single child node
		const ph = document.createComment('template-dissolve');
		el.replaceWith(ph);
		ph.replaceWith(child);
		return child;
	    } else {
		el.replaceWith(child);
		return child;
	    }
	}
	return el;
    }

    // Main inject: builds element from asset + mounts it
    // cfg: { selector, container, method, dissolve, attrs }
    inject(entry, cfg = {}) {
	const target = this.targetOf(cfg.selector);
	if(!target){
	    console.warn(`no target found for ${cfg.selector}`, entry);
	    return null;
	}
	const el = this.elementFromAsset(entry, { container: cfg.container });

	// decorate the container (id/class/etc.)
	if (cfg.attrs) {
	    for (const [k, v] of Object.entries(cfg.attrs)) {
		if (v === true) el.setAttribute(k, '');
		else if (v !== false && v != null) el.setAttribute(k, String(v));
	    }
	}
	DomInjector.insert(el, target, cfg.method || 'append');
	const finalNode = DomInjector.maybeDissolve(el, !!cfg.dissolve);
	return finalNode;
    }
}
