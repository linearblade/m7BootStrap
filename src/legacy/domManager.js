/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/**
 * DomRegistry
 *
 * A lightweight DOM reference tracker and manager.
 *
 * Used to register symbolic DOM nodes (e.g., `$overlay`, `$viewport`)
 * and provide safe lookup, attach/detach, and show/hide operations.
 * Designed for framework-free UI layers such as editors, HUDs, or modals.
 *
 * Features:
 * - Symbolic registration and lookup via string keys
 * - Automatic resolution of DOM targets (by ID, selector, or direct element)
 * - Detachment and reattachment of nodes without loss of state
 * - Controlled visibility toggling (`hide()` / `show()`)
 *
 * Example:
 *   const dom = new DomRegistry();
 *   dom.track('hud', document.getElementById('hud-container'));
 *   dom.hide('hud');
 *   dom.attach('hud', someParentElement);
 *
 * Notes:
 * - Supports lookup via:
 *     - Element reference
 *     - DOM ID string ("#id")
 *     - Registry key string ("$key")

 * makeID     --internal mostly
 * track      --track an existing object.
 * release    --stop tracking
 * findTarget --find
 * lookup     --also find
 * display    --set display style
 * attach     --attach element to dom
 * detach     --detach from dom
 * list       --list tracked
 * clear      --release all
 */

class domRegistry{
    constructor () {
	this.runMAX = 50;
	this.counter = 0;
	this.tracker = this._init();
    }

    //sets up tracking hash for managing loaded assets
    _init(){
	let tracker = {	};
	return tracker;
	
    }

    /**
     * Generates a unique ID for tracking DOM elements.
     *
     * Behavior:
     * - If a manual `id` is provided (string or number):
     *     - Returns the string form of the ID if not already tracked.
     *     - Returns `undefined` if the ID is invalid or already in use.
     *
     * - If no ID is provided:
     *     - Attempts to generate a numeric ID (as a string) by incrementing `this.counter`.
     *     - Will try up to `this.runMAX` times before giving up and returning `undefined`.
     *
     * @param {string|number} [id] - Optional manual ID to validate or assign.
     * @returns {string|undefined} - A unique ID string, or `undefined` if generation failed.
     **/
    makeID(id) {
	// If an ID is explicitly provided
	if (id !== undefined && id !== null) {
	    const type = typeof id;
	    if (type !== 'string' && type !== 'number') return undefined;

	    const strID = String(id);
	    if (this.tracker[strID]) return undefined;

	    return strID;
	}

	// Otherwise, generate a unique numeric ID
	let attempts = 0;
	while (attempts++ < this.runMAX) {
	    const autoID = String(this.counter++);
	    if (!this.tracker[autoID]) return autoID;
	}

	// Failed to generate a unique ID
	return undefined;
    }


    /**
     * Tracks a DOM element under a unique ID.
     *
     * @param {HTMLElement} e - The element to track.
     * @param {Object|string|number} [opts={}] - Optional tracking config or shorthand ID.
     * @returns {boolean} True if tracking succeeded; false otherwise.
     */
    track(e, opts = {}) {
	// Bail if no element provided or element is already tracked
	if (!e || this.lookup(e)) return false;

	// Normalize opts: support string/number shorthand for ID
	if (typeof opts === 'string' || typeof opts === 'number') {
	    opts = { id: String(opts) };
	} else if (typeof opts !== 'object' || opts === null) {
	    opts = {};
	}

	// Attempt to allocate a valid tracking ID
	const id = this.makeID(opts.id);
	if (!id) return false;

	// Create and store tracking record
	this.tracker[id] = {
	    e,
	    id,
	    dom: 1,
	    display: undefined,
	    user: opts.user || {}
	};

	return true;
    }


    /**
     * Stops tracking a previously registered DOM element.
     * 
     * Note: This does not remove the element from the DOM — it only deletes its
     * internal tracking reference. The element remains in the document unless manually removed.
     *
     * @param {HTMLElement|string} e - The element or symbolic ID to release.
     * @returns {boolean} True if the element was found and untracked; false otherwise.
     */
    release(e) {
	const rec = this.lookup(e);
	if (!rec) return false;

	delete this.tracker[rec.id];
	return true;
    }
    
    /**
     * Resolves a target reference into a DOM element.
     *
     * Accepts:
     * - A DOM element
     * - A tracker key string (e.g., "$overlay")
     * - A raw DOM ID (e.g., "map-container")
     * - A fallback value if the input is invalid
     *
     * @param {HTMLElement|string|null} e - The element or reference to resolve
     * @param {HTMLElement|string|null} defTarget - Optional fallback target if `e` fails
     * @returns {HTMLElement|undefined} The resolved DOM element, or undefined
     */
    findTarget(e, defTarget = undefined) {
	// If it's already a DOM element
	if (e instanceof Element) return e;

	// If it's a scalar string or number
	if (typeof e === 'string' || typeof e === 'number') {
	    const ref = String(e);

	    // Symbolic tracker ref: "$overlay" → lookup("overlay")
	    if (ref.startsWith('$')) {
		const tracked = this.lookup(ref.slice(1));
		if (tracked) return tracked.e;
	    }

	    // Otherwise treat as DOM ID
	    return document.getElementById(ref);
	}

	// Try fallback if provided
	if (defTarget !== undefined) {
	    return this.findTarget(defTarget);
	}

	return undefined;
    }

    /**
     * Retrieves a tracked entry by DOM element reference or symbolic ID.
     *
     * @param {HTMLElement|string|number} e - The element or ID to look up.
     * @returns {Object|undefined} The tracking record, or undefined if not found.
     */
    lookup(e) {
	if (e instanceof Element) {
	    // Lookup by DOM reference
	    for (const key in this.tracker) {
		const item = this.tracker[key];
		if (item.e === e) return item;
	    }
	} else if (typeof e === 'string' || typeof e === 'number') {
	    // Lookup by ID
	    return this.tracker[String(e)];
	}

	return undefined;
    }

    /**
     * Sets the CSS `display` style of a tracked element.
     *
     * Optionally tracks the current display state in the registry for use by `hide()` / `show()`.
     *
     * @param {HTMLElement|string} e - The element or ID to modify.
     * @param {string} [display=""] - The display value to apply (e.g., "block", "none").
     * @returns {boolean} True if the element was found and updated; false otherwise.
     */
    display(e, display = "") {
	const rec = this.lookup(e);
	if (!rec) return false;

	rec.e.style.display = display;
	rec.display = display; // useful if show/hide want to restore previous state
	return true;
    }
    
    /**
     * Detaches a tracked element from the DOM tree, but retains the element in memory.
     *
     * Optionally releases the element from the registry.
     *
     * @param {HTMLElement|string} e - Element or registry ID to detach.
     * @param {boolean} [release=false] - Whether to stop tracking the element.
     * @returns {HTMLElement|undefined} The detached element, or undefined if not found.
     */
    detach(e, release = false) {
	const rec = this.lookup(e);
	if (!rec || !rec.e) return undefined;

	const el = rec.e;

	if (el.parentNode) {
	    el.parentNode.removeChild(el);
	    rec.dom = 0;

	    if (release === true || release === 1) {
		this.release(rec.id);
	    }

	    return el;
	}

	return undefined;
    }


    /**
     * Reattaches a tracked element into the DOM at the specified location.
     *
     * @param {HTMLElement|string} e - Element or registry ID to attach.
     * @param {HTMLElement|string} [target=document.head] - Target container element (DOM or symbolic/ID).
     * @param {string} [subTarget="append"] - How to attach the element: "append", "prepend", "before", or "after".
     * @returns {boolean} True if attached successfully, false otherwise.
     */
    attach(e, target = undefined, subTarget = 'append') {
	const rec = this.lookup(e);
	if (!rec || !rec.e) {
	    console.warn('DomRegistry.attach: element not tracked:', e);
	    return false;
	}

	const el = rec.e;
	const container = target ? this.findTarget(target) : document.head;
	if (!container) return false;

	// Normalize subTarget
	const method = String(subTarget || 'append').toLowerCase();
	const insertFn = {
	    append: (el, parent) => parent.appendChild(el),
	    prepend: (el, parent) => parent.insertBefore(el, parent.firstChild),
	    before: (el, ref) => ref.parentNode?.insertBefore(el, ref),
	    after: (el, ref) => ref.parentNode?.insertBefore(el, ref.nextSibling)
	}[method];

	if (!insertFn) {
	    console.warn(`DomRegistry.attach: unsupported insert mode "${method}"`);
	    return false;
	}

	// Attach element
	insertFn(el, container);
	rec.dom = 1;
	return true;
    }


    list() {
	return Object.keys(this.tracker);
    }

    clear() {
	this.tracker = {};
	this.counter = 0;
    }
    
}
