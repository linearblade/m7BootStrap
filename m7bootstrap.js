

# --- begin: src/BootStrap.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/**
 * BootStrap.js
 * 
 * The central controller for initializing and managing the application boot process.
 * Delegates to modular subsystems: PackageManager, Repo, DomRegistry, etc.
 * 
 * Usage:
 *   const bootstrap = new BootStrap(net, { repo: {...} });
 *   await bootstrap.loadScene("scene:chess");
 **/
import concurrencyLimiter from './utils/concurrencyLimiter.js';
import Repo           from './repo/Repo.js';
import PackageManager from './packages/PackageManager.js';
import domInstall     from './dom/index.js' // for asset tracking/injection later
import MountManager   from './mount/MountManager.js';
import BootStrapLoadReport from './report/BootStrapLoadReport.js';
import Runners        from './runners/Runners.js';
export class BootStrap {
    /**
     * Initializes the BootStrap controller.
     *
     * @param {Net} net - Networking layer (must provide .http, .batch, etc.)
     * @param {Object} options - Boot configuration
     * @param {Object} [options.repo={}] - Initial repo configuration
     */
    constructor(net, { repo = {} } = {}) {
        if (!net) {
            throw new Error("BootStrap requires a valid Net instance");
        }

        this.net = net;

        this.repo     = new Repo(this, repo);              // Manages package source resolution
        this.packages = new PackageManager(this);      // Coordinates loading and asset/module registry
	this.data     = this.packages.data; //alias for now.
        this.dom      = domInstall(this);
	this.mount    = new MountManager(this);
	this.runners = new Runners(this);
    }


    /**
     * Load and resolve one or more package resources (e.g. scene, mount, engine).
     *
     * @param {Array|Object|string} resources - A list of resources or a single resource (symbolic string or inline object).
     * @param {Function|null} [onLoad] - Callback if all packages are loaded successfully.
     * @param {Function|null} [onFail] - Callback if any resource fails to load.
     * @param {Object} [options={}] - Optional config to pass into each resolve/load call.
     * @returns {Promise<boolean>} True if all succeeded, false otherwise.
     */
    async load(resources, options = {}) {
	const limit        = options?.limit ?? 8;
	const onLoad = options?.load  ?? null;
	const onFail = options?.error ?? null;
	
	const resourceList = Array.isArray(resources)
              ? resources
              : [resources]; // normalize single string/object into array

	const results = [];
	const errors  = [];
	const report = new BootStrapLoadReport();
	const {list:plist, report:repoReport}  = await this.repo.buildDependencyGraph(resources,options);
	report.noteRepoReport(repoReport);
	if(!repoReport.success){
	    console.error(repoReport.summary() );
	    return report.noteError("repo loading error").finalize();
	}

	const limiter = concurrencyLimiter(limit);

	const tasks = plist.map((def, i) =>
	    limiter(async () => {
		try {
		    const pkgReport = await this._loadPackage(def, options);
		    if (!pkgReport.success) {
			errors.push({ def, err: 'check console...' });
			const errStruct =  { id: def.id, ok: false,def,err:'non throwable error', comment: `package loading error for ${def.id}` };
			report.noteError(errStruct);
			return errStruct;
		    }
		    report.addPackageReport(pkgReport);
		    return { id: def.id, ok: true };
		} catch (err) {
		    console.error(err);
		    errors.push({ def, err });
		    const errStruct =  { id: def.id, ok: false, err,def };
		    report.noteError(errStruct);
		    return errStruct;
		}
	    })
	);

	const allStats = await Promise.all(tasks);
	
	const currentAssets = this.packages.data.getAssets();
	report.finalize();
	const [runner,rtype] = report.success
	      ? [onLoad,'LOAD']
	      : [onFail,'ERROR'];
	await this._runHandlers(
	    runner,
	    {
		report,
		options,
		err : errors
	    },`[BOOTSTRAP-${rtype}]`
	);
	

	return report;
    }

    /**
     * Internal helper: resolves and loads a package from a resource string or object.
     *
     * @param {object|string} input - Resource string or inline object
     * @returns {Promise<object|null>} Loaded package definition, or null on failure
     */
    async _loadPackage(def,options={}) {
	if (!def) {
            console.warn("[BootStrap] no package supplied:", );
            return { success:false};
	}

        if (this.packages.isLoaded(def.id)) {
	    console.warn(`isLoaded: Package "${def.id}" already loaded.`);
	    return {success:true};
        }

	
	const packageReport = await this.packages.load(def,options);
	if (!packageReport.success) {
            console.warn("[BootStrap] Failed to load package:", def.id || '[unknown]');
	}
	return packageReport;
    }

    
    /**
     * Internal utility to invoke one or more handler functions.
     *
     * Each handler is resolved using LIBFUNCGET and invoked with:
     *   - a context object `{ bootstrap, env }` where `env` is shared across all handlers
     *   - the user-provided `context` argument
     *
     * Supports:
     *   - a single function or symbolic string reference
     *   - an array of functions or symbolic references
     *   - no-op on null/undefined handlers
     *
     * @param {Function|string|Array<Function|string>|null} handlers - A function, string, or array of them.
     * @param {Object} context - A user-defined context object passed to each handler.
     * @param {string} [label='handler'] - Optional label used for error diagnostics in logs.
     */
    async _runHandlers(handlers, context = {}, label = 'handler',pkgID = null) {
	//console.warn(`running handlers for ${label}`);
	if (!handlers) return true;
	
	const list = Array.isArray(handlers) ? handlers : [handlers];
	const env = {};
	for (let i = 0; i < list.length; i++) {
            const rs = this._destructureFunctionResource(list[i]);
	    if (!rs) {
		console.warn(`[BootStrap] Handler error for [${label}] position [${i}]: could not parse handler`, list[i]);
		continue;
            }
	    //console.log(rs);

	    let fn;

	    if (rs.symbolic) {
		// e.g. "@logic.init"
		fn = this.packages._getSymbolicFunction(rs.fn, rs.bind);
	    } else if (rs.pkgLocal) {
		// e.g. "~logic.init"
		// If your module registry is namespaced by package, prefer that…
		if (pkgID){
		    fn = this.packages._getSymbolicFunction(`${pkgID}/${rs.fn}`, rs.bind);
		}
	    } else if (rs.local) {
		// e.g. "#mount.load"
		fn = this.constructor.LIBFUNCGET(rs.fn, false, this, rs.bind);
	    } else {
		// global/window resolution
		fn = this.constructor.LIBFUNCGET(rs.fn, false, null, rs.bind);
	    }
	    
            if (typeof fn !== 'function') {
		console.warn(`[BootStrap] Handler error for [${label}] position [${i}]: function does not exist: ${rs.original}`);
		continue;
	    }
	    try {
                await fn({bootstrap:this,env}, context);
	    } catch (err) {
                console.warn(`[BootStrap] Handler error for [${label}] position [${i}]:`, err);
	    }
	}
	return true;
    }


    /**
     * Unload one or more packages by ID or definition.
     *
     * @param {string|object|Array<string|object>} resources   Package id(s) or defs previously loaded
     * @param {Function|Function[]|string|string[]|object|object[]} [onDone=null]  Handler(s) after all unload succeed
     * @param {Function|Function[]|string|string[]|object|object[]} [onError=null] Handler(s) on first failure
     * @param {object} [options={}]  { ignoreMissing=true, cascade=false, ...custom }
     * @returns {Promise<boolean>} True on success, false on first failure
     */
    async unload(resources, onDone = null, onError = null, options = {}) {
	const { ignoreMissing = true, cascade = false, ...rest } = options;
	const list = Array.isArray(resources)?resources:[resources];
	//const list = this._normalizeResourceList(resources);
	const results = [];
	const errors = [];

	for (const entry of list) {
	    const id =
		  typeof entry === 'string'
		  ? entry
		  : entry?.id || entry?.lid || null;

	    // Missing/invalid id or not loaded
	    if (!id || !this.packages.isLoaded(id)) {
		if (!ignoreMissing) {
		    errors.push({ entry, id, reason: 'not_loaded' });
		    break;
		}
		continue;
	    }

	    try {
		const ok = await this.packages.unload(id, { cascade, ...rest });
		if (!ok) {
		    errors.push({ entry, id, reason: 'unload_failed' });
		} else {
		    results.push(id);
		}
	    } catch (err) {
		errors.push({ entry, id, reason: 'exception', err });
	    }
	}

	if (errors.length) {
	    await this._runHandlers(onError, { results, errors, options }, 'unload:onError');
	}else {
	    await this._runHandlers(onDone, { results, errors, options,pkg:list }, 'unload:onDone');
	}
	return errors.length === 0;
    }
 

    /**
     * Resolves a function from a string path or returns the function itself.
     * Optionally binds the resolved function to its parent object.
     *
     * @param {string|Function|null} f - Function reference or symbolic path string.
     * @param {boolean} [fallback=false] - If true, return a no-op function on failure.
     * @param {object|null} [scope=null] - Root object to resolve from (defaults to window).
     * @param {boolean} [bindContext=false] - If true, bind to parent object that holds the function.
     * @returns {Function|undefined}
     */
    static LIBFUNCGET(f, fallback = false, scope = null, bindContext = false) {
	const noop = () => {};
	const failVal = fallback ? noop : undefined;
	const isPlainObj = obj =>
	      !!obj && typeof obj === 'object' && !Array.isArray(obj);
	
	//const base = (scope && typeof scope === 'object' && !Array.isArray(scope)) ? scope : window;
	const base = isPlainObj(scope) ? scope : (typeof globalThis !== 'undefined' ? globalThis : {});

	if (!f) return failVal;
	if (typeof f === 'function') return bindContext ? f.bind(base) : f; //scope || window
	if (typeof f !== 'string') return failVal;


	const parts = f.split('.');
	if (!parts.length) return failVal;

	let ctx = base;
	let parent = null;
	for (let i = 0; i < parts.length; i++) {
            const key = parts[i];
            if (typeof ctx !== 'object' || ctx === null || !(key in ctx)) return failVal;

            parent = ctx;
            ctx = ctx[key];
	}

	if (typeof ctx === 'function') {
            return bindContext ? ctx.bind(parent) : ctx;
	}

	return failVal;
    }

    /**
     * Normalize a function handler input into a consistent resource object.
     *
     * Supports strings, function references, or structured hash inputs.
     *
     * Examples:
     * - "@foo.bar" → { fn: "foo.bar", bind: false, symbolic: true, original: "@foo.bar" }
     * - "myFunc" → { fn: "myFunc", bind: false, symbolic: false, original: "myFunc" }
     * - () => {} → { fn: [Function], bind: false, original: "anonymous" }
     * - function namedFn() {} → { fn: [Function: namedFn], bind: false, original: "namedFn" }
     * - { fn: "@pkg.fn", bind: true, extra: "meta" }
     *     → { fn: "pkg.fn", bind: true, symbolic: true, original: "@pkg.fn", extra: "meta" }
     *
     * @param {Function|string|object} input - A function reference, string identifier, or configuration object.
     * @returns {object|null} Normalized resource object with at least { fn, bind, original, symbolic? }
     */

    _destructureFunctionResource(input) {
	if (typeof input === 'function') {
            return { fn: input, bind: false, local: false, original: input.name || 'anonymous' };
	}

	if (typeof input === 'string') {
            const isSymbolic = input.startsWith('@');
	    const isLocal = input.startsWith('#');
	    const isPkg = input.startsWith('~');
            return {
		original: input,
		fn: isPkg || isSymbolic || isLocal? input.slice(1) : input,
		bind: isLocal?true:false,
		local : isLocal,
		pkgLocal : isPkg,
		symbolic: isSymbolic
            };
	}

	if (typeof input === 'object' && input !== null && 'fn' in input) {
            const parsed = this._destructureFunctionResource(input.fn);
            return {
		...input,
		...parsed,
		bind: parsed.local?true:!!input.bind,

            };
	}

	return null;
    }   
}


export default BootStrap;


# --- end: src/BootStrap.js ---



# --- begin: src/dom/DomInjector.js ---

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
	    el.content.append(document.createTextNode(String(text)));
	} else {
	    el.textContent = String(text);
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


# --- end: src/dom/DomInjector.js ---



# --- begin: src/dom/DomRegistry.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/**
 * DomRegistry
 *
 * A lightweight DOM tracking utility for managing dynamically inserted elements.
 * Primarily used for scene/module cleanup and DOM lifecycle control in dynamic applications.
 *
 * Features:
 * - Tracks DOM elements with auto-assigned or symbolic IDs
 * - Supports logical grouping (e.g., "scene:menu", "hud") for batch operations
 * - Can optionally remove elements from the DOM when released
 * - Uses a Map internally for consistent key-based tracking
 *
 * Methods:
 * - track(el, opts): Track an element (with optional id/group/user metadata)
 * - release(el, destroy): Stop tracking (and optionally remove from DOM)
 * - clear(group, destroy): Remove all or grouped elements from registry (and optionally DOM)
 * - list(group): Return tracked IDs (optionally filtered by group)
 * - listGroups(): Return all group names in use
 * - resolveDom(ref): Resolve an element via direct DOM, ID string, or `$trackerRef`
 *
 * Internal:
 * - _makeID(id): Allocates or validates a unique ID
 * - _lookup(ref): Internal lookup by DOM node or ID
 *
 * Example:
 *   dom.track(someEl, { group: "scene:game" });
 *   dom.clear("scene:game", true);  // removes all and detaches from DOM
 *
 */
export class DomRegistry{
    constructor () {
	this.runMAX = 50;
	this.counter = 0;
	this.tracker = new Map();
    }


    /**
     * Tracks a DOM element under a unique ID.
     *
     * @param {HTMLElement} e - The element to track.
     * @param {Object|string|number} [opts={}] - Optional tracking config or shorthand ID.
     *   - `id`: (string|number) Optional explicit tracking ID
     *   - `group`: (string) Optional group name for logical grouping (e.g., "scene:map")
     *   - `user`: (object) Optional user metadata
     * @returns {boolean} True if tracking succeeded; false otherwise.
     */
    track(e, opts = {}) {
	// Bail if no element provided or element is already tracked
	if (!e || this._lookup(e)) return false;

	// Normalize opts: support string/number shorthand for ID
	if (typeof opts === 'string' || typeof opts === 'number') {
	    opts = { id: String(opts) };
	} else if (typeof opts !== 'object' || opts === null) {
	    opts = {};
	}

	// Attempt to allocate a valid tracking ID
	const id = this._makeID(opts.id);
	if (!id) return false;

	// Create and store tracking record
	this.tracker.set(id,  {
	    e,
	    id,
	    group: opts.group || 'none',
	    user: opts.user || {}
	} );

	return true;
    }

    /**
     * Stops tracking a previously registered DOM element.
     *
     * Optionally removes the element from the DOM as well.
     *
     * @param {HTMLElement|string} e - The element or symbolic ID to release.
     * @param {boolean} [destroy=false] - If true, also removes the element from the DOM.
     * @returns {boolean} True if the element was found and untracked; false otherwise.
     */

    release(e, destroy = false) {
	const rec = this._lookup(e);
	if (!rec) return false;

	if (destroy && rec.e?.parentNode) {
	    rec.e.parentNode.removeChild(rec.e);
	}

	this.tracker.delete(rec.id);
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
    resolveDom(e, defTarget = undefined) {
	// If it's already a DOM element
	if (e instanceof Element) return e;

	// If it's a scalar string or number
	if (typeof e === 'string' || typeof e === 'number') {
	    const ref = String(e);

	    // Symbolic tracker ref: "$overlay" → lookup("overlay")
	    if (ref.startsWith('$')) {
		const tracked = this._lookup(ref.slice(1));
		if (tracked) return tracked.e;
	    }

	    // Otherwise treat as DOM ID
	    return document.getElementById(ref);
	}

	// Try fallback if provided
	if (defTarget !== undefined) {
	    return this.resolveDom(defTarget);
	}

	return undefined;
    }

    /**
     * Retrieves a tracked entry by DOM element reference or symbolic ID.
     * internal method
     *
     * @param {HTMLElement|string|number} e - The element or ID to look up.
     * @returns {Object|undefined} The tracking record, or undefined if not found.
     */
    _lookup(e) {
	if (e instanceof Element) {
	    // Lookup by DOM reference
	    for (const [, item] of this.tracker.entries()) {
		if (item.e === e) return item;
	    }
	} else if (typeof e === 'string' || typeof e === 'number') {
	    // Lookup by ID
	    return this.tracker.get(String(e));
	}

	return undefined;
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
    _makeID(id) {
	// If an ID is explicitly provided
	if (id !== undefined && id !== null) {
	    const type = typeof id;
	    if (type !== 'string' && type !== 'number') return undefined;

	    const strID = String(id);
	    if (this.tracker.has(strID)) return undefined;

	    return strID;
	}

	// Otherwise, generate a unique numeric ID
	let attempts = 0;
	while (attempts++ < this.runMAX) {
	    const autoID = String(this.counter++);
	    if (!this.tracker.has(autoID)) return autoID;
	}

	// Failed to generate a unique ID
	return undefined;
    }
    
    /**
     * Lists all tracked IDs.
     *
     * @param {string|null} group - Optional group name to filter by. If null, returns all IDs.
     * @returns {string[]} Array of matching tracker IDs.
     */
    list(group = null) {
	if (group === null) {
	    return Array.from(this.tracker.keys());
	}

	const result = [];
	for (const [id, rec] of this.tracker.entries()) {
	    if (rec.group === group) result.push(id);
	}
	return result;
    }
    
    /**
     * Clears tracked elements.
     *
     * @param {string|null} group - If specified, only clears elements in this group.
     * @param {boolean} destroy - If true, also removes elements from the DOM.
     */

    clear(group = null, destroy = false) {
	if (group === null) {
	    // Clear everything
	    for (const id of this.tracker.keys()) {
		this.release(id, destroy);
	    }
	    this.counter = 0;
	    return;
	}

	// Clear only matching group
	for (const [id, rec] of this.tracker.entries()) {
	    if (rec.group === group) {
		this.release(id, destroy);
	    }
	}
    }

    /**
     * Returns a list of all group names currently in use.
     *
     * @returns {string[]} Unique group names found in the tracker.
     */

    listGroups() {
	const groups = new Set();

	for (const rec of this.tracker.values()) {
	    groups.add(rec.group || 'none');
	}

	return Array.from(groups);
    }   
}

export default DomRegistry;


# --- end: src/dom/DomRegistry.js ---



# --- begin: src/dom/index.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
import DomRegistry from './DomRegistry.js'; //  for asset tracking later
import DomInjector from './DomInjector.js'; //  for asset injection


export default function domInstall(controller){
    
    return {
	registry: new DomRegistry(controller),
	injector: new DomInjector(controller)
    };
};


# --- end: src/dom/index.js ---



# --- begin: src/legacy/bootStrap.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
//var docRoot = "./";
//var frameworkInstall = 'framework/';
/*
  fw = new framework({c:'foo'},{base:'./'});
  //--------------------------------------------------------
  //NAME: loadCSS 
  //DESC: loads css intothe document.
  //ARGS: string|hash OR array of string|hash , opts {}
  //opts overrides passed. which overrides constructor base.
  //--------------------------------------------------------

  fw.loadCSS({href:'test.css', base:'overrides constructor'},{base:'overrides passed, and constructor'});
  fw.loadCSS("test.css", {base:'foo'});
  fw.loadCSS(["test.css"], {base:'foo'});
  //--------------------------------------------------------


  bs = new bootStrapper();
  //append elements to the dom presumable [js | css ] .. could be anything tho.
  bs.append({url: 'framework/lib/js/utilsGeneral.js', attrs:{load:function(){console.log('hello world')}},target:document.head, tag:'script' }) 
  bs.append('framework/lib/js/utilsGeneral.js', {target:document.head, tag:'script', attrs:{load:function(){console.log('hello world')}}});
  bs.append('framework/lib/js/utilsGeneral.js', {target:document.head, tag:'script'});

  //may be out dated. manually loads objects as css without need to specify.
  bs.loadCSS 
  
  //todo
  [ ] loadAsset : load an asset, and store it. action on it if desired.
  [ ] loadLib : load a library into the bs.lib object from remote source.
  [ ] document append
  [ ] document loadCSS
  [ ] construct/document loadJS
  [ ] run : runs a program to perform a series of actions.
*/


var assets;
var jsonMap = {};
var scriptLoader;
var fw;
var tester;
var startupConfig;
var dataManager ;
var urlParams;
var state = {};


/*parse the query string*/
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();


/*
  DESIRED FEATURES.
    -console loader.
    -load everything needed at start
    -run events
    -load page assets.

  CSS TODO:
    track css loaded. 
    css aliasing for quick load / unload
    unload css by ID
    url stripping of double slashes
    asynchronous loading? trigger events?
    https://stackoverflow.com/questions/32759272/how-to-load-css-asynchronously
  
*/


/*
  string
    src       : (absolute|relative) link
    keywords  : 'expands to a link'
  hash
    config      : a config file. no work required.
    src pointer : a pointer to a config. may require work.
	
  confs = ['./test.js', '/abs.js', {src: 'pointer.js', type:js|json,target:'variablename'},{an actual config hash'} ]
*/
var lib = {
    p : console.log,
    //printDoc: print
    app: {
	bootstrap:{
	    append:{},
	    remote:{
		wrapper:{}
	    },
	},
	load:{
	    process:{},
	    apply:{}
	}
    }
};

//print = console.log;
printDocument = print;
print = console.log;

   /*

      options (optional): An object containing any custom settings that you want to apply to the request. Some of the common options include:
      method: The HTTP method (e.g., GET, POST, PUT, DELETE, etc.).
      headers: An object containing headers to be sent along with the request.
      body: The body of the request, typically used with methods like POST or PUT.
      mode: The mode of the request (e.g., cors, no-cors, same-origin).
      credentials: The credentials policy (e.g., omit, same-origin, include).


      handier than using idiotic fetch promise syntax.
     */
lib.fetch =  function (url,opts,fetchOpts){
	let responseFunc, dataFunc, errorFunc,info;
	opts = lib.hash.merge(
	    {
		response:'text',
		data    : undefined,
		error   : undefined,
	    }, lib.hash.to(opts,'data')
	);
	responseFunc = (!opts.response ||opts.response =='text')?
	    function(response,info){return response.text();}:
	(
	    opts.response == 'json'?
		function(response,info){return response.json();}:
	    lib.func.get(opts.response)
	);

	dataFunc = !opts.data ?
	    function(data,info){console.log(data,info);}:
	lib.func.get(opts.data);
	errorFunc = !opts.error?
	    function(error,info){console.error('There has been a problem with your fetch operation:', error,info);}:
	lib.func.get(opts.error);
	info = {
	    url,
	    fetchOpts: fetchOpts,
	    opts: opts
	};
	fetch(url,fetchOpts)
	    .then(
		function(info){
		    return function(response){
			return responseFunc(response, info);
		    }
		}(info)
	    )
	    .then(
		function(info){
		    return function(data){
			return dataFunc(data,info);
		    }
		}(info)
	    )
	    .catch(
		function(info){
		    return function(error){
			return dataFunc(error,info);
		    }
		}(info)
	    );
	
	return;
};

//$SECTION -LIB.UTILS
lib.utils = (function(lib){
    function getDispatch(){return {};  }
    function isArray(arg) {
	if (typeof arg == 'object') {
	    return Array.isArray(arg);
	    //var criteria = arg.constructor.toString().match(/array/i);
	    //return (criteria !=null);
	}
	return false;
    };
    function toArrayold (list){
	if (!list)return [];
	return (isArray(list))?list:[list] ;
    }
    function toArray (list, split=undefined){
	if (!list)return [];
	if(isArray(list))return list;
	if (!isEmpty(split)  && typeof(list) =='string'){ //figure out what a regexp is
	    //console.log('list=',list, 'split=',split);
	    return list.split(split);
	}else {
	    return [list];
	}
    }

    function isHash (obj) {
	if(!obj) return false;
	if(Array.isArray(obj)) return false;
	if(!obj.hasOwnProperty('constructor') && obj.constructor != Object) return false;
	return true;
    }
    function toHash(obj, hotkey=undefined){
	let def = {};
	if (isHash(obj))return obj;
	if (!isEmpty(hotkey) &&  baseType(hotkey,'string'))def[hotkey] = obj;
	return def;

	if (!isHash(def) ) {
	    opts = def;
	    def = {};
	}
	if (isHash(obj))return merge(def,obj);
	if (!isHash(opts) &&  !isEmpty(opts) && baseType(opts,'string') )
	    opts = {hotkey: opts};
	
	if (!isEmpty(opts['hotkey']) &&  baseType(opts['hotkey'],'string')){
	    def[opts['hotkey']] = obj;
	}
	if (isHash(opts['def']))def = merge(opts.def, def);
	
	return def;
    }

    

    
    function hasKeys (obj, keys,opts={}){
	if (!isHash(obj))return 0;
	keys = toArray(keys);
	for (let i =0,key=keys[i];i<keys.length;key=keys[++i]){
	    if(!(key in obj))return 0;
	}
	return 1;
    }


    
    function isScalar(v){
	return (typeof(v) =='string' || typeof(v) =='number')?1:0;
    }
    
    function toString(v,opts){
	let rv = undefined;
	opts = opts===undefined?{}:baseType(opts, 'object')?opts:{force:opts};
	if(typeof(v) =='string' || typeof(v) =='number'){
	    rv = ""+v;
	    if (opts['lc'])rv=rv.toLowerCase();
	}else if  (opts['force']){
	    rv = "";
	}
	
	return rv;
    }


    function baseType (value,comp){
	comp = toArray(comp);
	
	if (comp.length){
	    for (let i =0, item=comp[i]; i<comp.length;item=comp[++i]){
		if (value === null)
		    if(item.toLowerCase() == 'null'){
			return true;
		    }else{
			return false;
		    }
		var type = typeof(value);
		if (type == 'object'){
		    if (Array.isArray(value))type= 'array';
		}

		//return (type == item.toLowerCase())?true:false;
		if (item.toLowerCase() == type)return true;
	    }
	    return false;
	}else {
	    if (value === null)return 'null';
	    var type = typeof(value);
	    if (type == 'object'){
		if (Array.isArray(value))return 'array';
	    }
	    return type;
	}
	
    }
	
    function isEmpty(value){
	return (typeof value === "undefined" || value === null || value === "");
    }

    
    function linkType (item,check = []){
	let type = undefined;
	check = toArray(check);
	if (isHash(item))type= "hash";
	else if (baseType(item,'string')){
	    //patt= new RegExp('^a',i);
	    if (item.match(/^\//))type= 'absolute';
	    else if (item.match(/^https?\:\/\//))type= 'url';
	    else type= 'relative';
	};
	
	if (check.length){
	    for (let  i=0; i < check.length;i++){
		if (type == check[i] )return 1;
	    }
	    return 0;
	}
	return type;
    }

    function deepCopy (inObject,opts = {}) {
	let outObject, value, key;
	opts = toHash(opts);
	
	if (typeof inObject !== "object" || inObject === null) {
	    return inObject // Return the value if inObject is not an object
	}


	if(opts['force'] != 1 && typeof inObject === "object" && !(inObject instanceof Element) && !isArray(inObject) && !isHash(inObject)){
            //console.log('not traversing, its probably a class '+inObject.constructor.name);
            return inObject; //(dont copy classes);                                                                                                                 
	}else {
	    //console.log('will try ' +inObject.constructor.name);
	}
	/*
	if (!inObject.constructor.name.match(/^Object$/i)){
	    console.log('not traversing '+inObject.constrcutor.name);
            return inObject; //(dont copy classes);
        }
	*/
	// Create an array or object to hold the values
	outObject = Array.isArray(inObject) ? [] : {};
	
	for (key in inObject) {
	    value = inObject[key];
	    // Recursively (deep) copy for nested objects, including arrays
	    if (value instanceof Element)outObject[key]=opts.dom ==1?deepCopy(value):value;
	    else outObject[key] = deepCopy(value);
	}
	
	return outObject;
    }

    function hashOr(keys, hash, def){
	let list = toArray(keys);
	for (k of list){ 
	    if (k in hash) return hash[k];
	}
	return def;
    }
    //this is my crack sauce way better version. adapted from perl hash merge, and improved.
    function merge(left , right,opts = undefined){
	
	if (!(isHash(left) && isHash(right))) return undefined;
	var left = deepCopy(left);
	var right = deepCopy(right);
	
	var hmap = {'array': 'a', 'object':'h','element':'e'};
	//(isHash(opts) && ('disp' in opts))?opts.disp:
	
	if ( typeof this.disp == 'undefined' ){
	    this.disp =  {
		hh: function (l,r){return merge(l,r,opts);},
		as: function (l,r){l.push(r); return l;},
		aa: function (l,r){return l.concat(r);},
		'default': function (l,r){return r;}
	    };
	}
	
	//var disp =merge.disp;
	var disp = ( isHash(opts) && ('disp' in opts) )?{...this.disp, ...opts.disp}:this.disp;
	for (var p in right){
	    let type = (left[p] instanceof Element)?'e':(
		hashOr(baseType(left[p]), hmap, 's') + '' +
		    (right[p] instanceof Element?'e':hashOr(baseType(right[p]),hmap,'s')  ));
	    //console.log(`basetype l=${baseType(left[p])} || r=${baseType(right[p])} type=${type} key=${p} iel=${left[p] instanceof Element} ier=${right[p] instanceof Element}`);
	    
	    if (!(type in disp)) type= 'default';
	    left[p]=disp[type](left[p],right[p]);
	    
	}
	return left;
    }

    function hashStrip(rec, opts)  {
	if (!isHash(rec) ) return rec;
	let nRec = {};
	Object.keys(rec).forEach( (k,index) => {
	    if (rec[k] ===undefined)return;
	    nRec[k] = rec[k];
	});
	return nRec;
    };

    /*this may not work properly in all cases if you want to use it with objects, 
      even with apply(), unless you know what type of function your getting*/
    function getFunction(f,dummy=0){
	if(f){


            if (typeof(f) == "function"){
		return (f);
            }else if(window[f]){
		return (window[f]);
            }else if(typeof f =='string')  {
		let parts = f.split(".");
		let root = parts.length?parts.shift():undefined;
		if (parts.length  && window[root]){
		    let t = window[root];
		    for(let i = 0; i < parts.length; i++) {
			if (t[parts[i]]){
			    t = t[parts[i]];
			}else {
			    t=undefined;break;
			}
		    }
		    //let t = lib.hash.get(window[root],parts);
		    if (baseType(t, 'function'))return t;
		}
		    
	    }
	}

	return dummy?function () {}:undefined;
	return undefined;

    }


    function lc(v,fuckit=0){
	if (!isScalar(v) && !fuckit)return undefined;
	return ( (""+v).toLowerCase() );
    }
    


    function stripComments(data,opts){
	let cleaned = data;;
	opts = toHash(opts,'strip'); if(!opts['strip'])opts['strip'] = 1;
	opts['strip'] = toString(opts['strip']);
	if (opts['strip'].match(/1|a|m/i))
	    cleaned = data.replace( /\/\*[.\s\S]*?\*\//g, ""); // strip multi line
        if (opts['strip'].match(/1|a|s/i))
	    cleaned = cleaned.replace(/\/\/.*/g, ""); //strip single line
	return cleaned;
    }

    function base64DecodeUnicode(str) {
	return decodeURIComponent(Array.from(atob(str)).map(c =>
	    '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    }

    function base64EncodeUnicode(str) {
	return btoa(encodeURIComponent(str).replace(
	    /%([0-9A-F]{2})/g, 
	    (match, p1) => String.fromCharCode('0x' + p1))
		   );
    }
    
    function getDispatch(){
	return {
	    isArray : isArray,
	    toArray : toArray,
	    //toArray2 : toArray2,
	    isHash  : isHash,
	    toHash  : toHash,
	    //hashSet : hashSet,
	    hasKeys : hasKeys,
	    isScalar: isScalar,
	    toString: toString,
	    baseType: baseType,
	    isEmpty : isEmpty,
	    
	    hashStrip:hashStrip,
	    merge:merge,
	    deepCopy:deepCopy,
	    linkType:linkType,
	    hashOr:hashOr,
	    getFunction:getFunction,
	    stripComments: stripComments,
	    lc:lc,
	    base64: {
		decode: base64DecodeUnicode,
		encode: base64EncodeUnicode
	    }
	};
    }
    return getDispatch();
})();

lib.array = ( function(lib){


    function arraySubtract(list, exclude){
	list = lib.utils.toArray(list, /\s+/);
	list = list.slice();
	exclude = lib.utils.toArray(exclude, /\s+/);
	console.log(list,'ex',exclude);
	for (let ex of exclude){
            let index;
            while (-1 !== (index = list.indexOf(ex))){
		list.splice(index, 1);
            }
	}
	return list;

    }


    function arrayAppend(input, pre="",post=""){
	let list , output=[];
	if (!lib.utils.baseType(input, ["array","string","number"])) return undefined;
	input = lib.utils.toArray(input, /\s+/);

	for (let i=0; i<input.length;i++){
            output[i] = pre+input[i]+post;
	}
	return output;
    }
    // lib/array.js or wherever your utilities live
     function random(arr) {
	if (!Array.isArray(arr) || arr.length === 0) return null;
	const index = Math.floor(Math.random() * arr.length);
	return arr[index];
    }
    function getDispatch(){
	return {
	    append:arrayAppend,
	    subtract: arraySubtract,
	    is : lib.utils.isArray,
	    to : lib.utils.toArray,
	    random : random
    	};
    }
    return getDispatch();
})(lib);


//$SECTION -LIB.EVENT
lib.event = (   function(lib){
    function setEventListeners(events){
	events = lib.utils.toArray(events);
	console.log('setting event listeners');
	if (!lib.utils.isArray(events)) return undefined ;
	for (i in events){
	    if (lib.utils.isArray(events[i])) events[i] = lib.args.parse(events[i], {},"target event handler options" );
	    console.log(events[i]);
            let e ;
            if (!lib.utils.isHash(events[i]))continue;
            e= lib.dom.getElement(events[i].target) || lib.dom.getElement(events[i].id);
            if (e){
		console.log('adding event for '+(events[i].id || events[i].target)+ ': ' +events[i].handler);
		//console.log(getFunction(events[i].handler));
		e.addEventListener(events[i].event, lib.utils.getFunction(events[i].handler), events[i].options);
            }
	}
    }
	
    function radioSet(list=[],event,on,off,options,ws){
	let events = [],eList = [];
	list = lib.utils.toArray(list);
	on = lib.utils.getFunction(on);
	console.log(`checking if on defined (${on})`);
	if (!on) return 0;
	off = lib.utils.getFunction(off);

	
	for (let i = 0, item=list[i]; i <list.length;item=list[++i]){
	    console.log(`i=${i} , item=${item}, event=${event}, on=${on}, off=${off}`);
	    let eventItem = undefined; //event,handler,options
	    let target,selector,wrapper;
	    if (lib.dom.isDom(item)){
		target = lib.dom.getElement(item);
	    }else if(lib.utils.isArray(item)){
		target = lib.dom.getElement(item[0]);
		selector = item[1];
	    }else if(lib.utils.isHash(item)){
		target = lib.dom.getElement(lib.hash.get(item,"t"));
		selector = lib.hash.get(item,"s");
	    }else if (lib.utils.baseType(item, 'string')){
		console.log(`item is a string ${item} ${i}`);
		target = lib.dom.getElement(item);
		selector = item;
	    }
	    //console.log(`trying ${selector}`);
	    if (!target) continue;
	    eList.push({target:target,selector:selector});
	    //console.log(`setting ${selector}`);
	    wrapper = function(eList, target, selector,ws){
		return function (e){
		    let pp = {
			selector : selector,
			target :target,
			ws : ws,
			current : {target:target, selector:selector}
		    };

		    on(e,pp);
		    if(!off) return;
		    for (i in eList){
			let le = eList[i];
			pp['current'] = le;
			if (e.target == le.target){
			    //console.log(`on ${pp.selector} ${e.target.id} == ${le}`);
			    //on(e,pp);
			}else {
			    //console.log(`off ${pp.selector} ${e.target.id} != ${le}`);
			    
			    off(e,pp);
			}
		    }
		}
	    };
	    eventItem = {
		target: target,
		event : event,
		handler : wrapper(eList, target,selector, ws),
		options : options
	    };
	    events.push(eventItem);
	}
	console.log(events);
	if (events.length)setEventListeners(events);

    }
    
    

    function getDispatch(){
	return {
	    set: setEventListeners,
	    radioSet: radioSet
	    
	};
    }
    return getDispatch();
})(lib);

    
//$SECTION -LIB.DOM
lib.dom = (   function(lib){
    function getDispatch(){return {};  }
    function isDom(o) {
	return(o instanceof Element);
    }


    function getElement(id){
	if(isDom(id)) return id;
	return document.getElementById(id);
    }

    function byId(id){
	return document.getElementById(id);
    }
    function removeElement( e ) {
	var e = getElement(e);
	if (!e) return undefined;
	e.parentNode.removeChild(e);
	return e;
    }

    function qs() {
	var match,
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
	    search = /([^&=]+)=?([^&]*)/g,
	    decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
	    query  = window.location.search.substring(1);
	
	urlParams = {};
	while (match = search.exec(query))
	    urlParams[decode(match[1])] = decode(match[2]);
	return;
    }

    function insertAfter(newNode, existingNode) {
	existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
    }

    function unset(e,attr){
	if(!(lib.dom.isDom(e) || attr)) return undefined;
	e.removeAttribute(attr);
	return;
    }
    //todo allow total data set upload later
    function set(e,attr,val){
        if(!(lib.dom.isDom(e) || attr)) return undefined;
	let m;

	if(m = attr.match(/^(set|add|remove|toggle)Class$/i)){
	    let lc = m[1].toLowerCase();
	    let map = {
		'set' : ()=>{e.classList.set(val)},
		'add' : ()=>{e.classList.add(val);},
		'remove' : ()=>{e.classList.remove(val);},
		'toggle' : ()=>{e.classList.remove(val);}
	    };
	    return map[lc]();
	}else if (m = attr.match(/^dataset(\.)?(.*)$/i)){
	    if (m[1]){
		lib.hash.set(e.dataset,m[2]);
		return lib.hash.get(e.dataset,m[2]);
	    }
	    else return undefined;
	}else if (m= attr.match(/^(tagName|value|name|text|textContent|innerHTML|type|href|src|disabled|selected|checked)$/i)){

	    let map= {
		"tagname" : "tagName",
		"value" : "value",
		"name" : "name",
		"text" : "text",
		"textcontent" : "textContent",
		"innerhtml" : "innerHTML",
		"type" : "type",
		"href" : "href",
		"src" : "src",
		"disabled":"disabled",
		"selected":"selected",
		"checked" : "checked"
	    };
	    let lc = m[1].toLowerCase();
	    return  e[(lc in map)?map[lc]:m[1]] = val; 

	    if (m[1].toLowerCase() =='tagname') m[1] = "tagName"; //this probably doesnt work, but may some year in the future.
	    else if (m[1].toLowerCase() =='textcontent') m[1] = "textContent";
	    else if (m[1].toLowerCase() =='innerhtml') m[1] = "innerHTML";
	    else if (m[1].toLowerCase() =='value') m[1] = "value";
	    else if (m[1].toLowerCase() =='type') m[1] = "type";
	    else if (m[1].toLowerCase() =='name') m[1] = "name";
	    else if (m[1].toLowerCase() =='text') m[1] = "text";
	    else if (m[1].toLowerCase() =='href') m[1] = "href";
	    return e[m[1]] = val;
	    
        }else{
	    if(lib.array.to(attr,'.').length>1)	lib.hash.legacySet(e,attr,val);
	    else e.setAttribute(attr,val);
	    return e.getAttribute(attr,val);
        }

    }
    
    //work in progress. collect all the carvout properties , and make it insenstive , fixing for later.
    function get(e,attr){
        if(!lib.dom.isDom(e)) return undefined;
	if(!attr)return e;
	if (m = attr.match(/^dataset(\.)?(.*)$/i)){
	    if (m[1])return lib.hash.get(e.dataset,m[2]);
	    return e.dataset;
	}else if (m= attr.match(/^(tagName|value|name|text|textContent|innerHTML|type)$/)){
	    return e[m[1]];
        }else{
	    return e.getAttribute(attr);
        }
	
        return 1;

    }

    // Takes a nebulous target and attempts to squeeze a DOM node from it
    function attemptDom(input, barf = false) {
	// Check if input is empty or already a DOM element
	let node = lib.utils.isEmpty(input) ? null :                                // Handle empty input
            lib.dom.is(input) ? input :                                      // It's already a DOM element
            typeof input === 'object' && input.target ? input.target :       // Likely an event handler
            lib.dom.getElement(input) ?? document.querySelector(input);      // Try getting DOM or query selector

	// Optionally throw an error if not found
	if (!node && barf) {
            throw Error(`cannot derive a dom node from :`,input);
        }

	return node;
    }

    
    function getDispatch(){
	return {
	    get: get,
	    set: set,
	    is: isDom,
	    attempt: attemptDom,
	    isDom: isDom,
	    getElement: getElement,
	    byId: byId,
	    removeElement: removeElement,
	    qs:qs,
	    insertAfter:insertAfter,
	    
	};
    }
    return getDispatch();


})(lib);


//$SECTION -LIB.DOM.CREATE
lib.dom.create = (function(lib){
    function js(url, attrs){
	if (!lib.utils.isHash(attrs)) attrs = {};
	attrs = lib.utils.merge({
	    'async': true,
	    type: "text/javascript",
	    src: url
	}, attrs);
	return element("script", attrs, undefined);
	
    }
    
    function css(url, attrs){
	if (!lib.utils.isHash(attrs)) attrs = {};
	attrs = lib.utils.merge({
	    rel: "stylesheet",
	    type: "text/css",
	    href: url
	}, attrs);
	return element("link", attrs, undefined);
    }
    
    function element(tag, attrs={}, content=undefined){
	var e =document.createElement(tag);
	//console.log('CREATE ELEMENT ATTRS', attrs);
	if (!this.special){
	    let eventHandler = function (e,key,value){
		let fun = lib.utils.getFunction(value);
		if (fun)e.addEventListener(key, fun ,true);
	    };
	    this.special = {
		load  : eventHandler,
		error : eventHandler,
		click : eventHandler
	    };
	    
	}
	if (!lib.utils.isHash(attrs)) attrs = {};

	for (let key of Object.keys(attrs)){
	    if (this.special[lib.utils.lc(key)]){
		this.special[lib.utils.lc(key)](e,key,attrs[key]);
	    }else {
		e.setAttribute(key, attrs[key]);
	    }
	}
	return e;
    }
    
    function getDispatch(){
	return {
	    css:css,
	    link:css,
	    js:js,
	    element:element
	};
    }
    return getDispatch();


})(lib);

lib.args = (function(lib){
    //takes a list and a list of names, and returns them as a hash.
    //the last arg is the hash,
    //parseArgs(args, {req: " ", opt:" ",arg: 1|0,pop:1|0}
    function parse(args, def, opts){
	let out = {}, defOpts = {pop:1, arg:0};
	opts = lib.utils.merge(defOpts, lib.utils.toHash(opts,'parms'));
	def = lib.utils.toHash(def);
	args = lib.utils.toArray(slice(args)); //convert potential 'Arguments' to array
	parms = lib.utils.toArray(opts['parms'], /\s+/);
	req = lib.utils.toArray(opts['req'], /\s+/);	
	//console.log('>>',parms,req,opts['req'],'<<');
	out = (opts.pop && lib.utils.baseType(args[args.length-1],'object') && !lib.dom.isDom(args[args.length-1]))?args.pop():{};
	out = lib.utils.merge(def,out);
	for (let i =0; i < parms.length; i++){
	    let key = parms[i], value;
	    if (i > args.length-1)break;
	    value = args[i];
	    lib.hash.set(out, key, value);
	}
	for (let i =0; i < req.length; i++){
	    let key = req[i];
	    if (!(key in out))return undefined;
	}
	return out;
	
    }
    //performs array slice on arguments object
    function slice(args,a,b=undefined){
	return Array.prototype.slice.call(args).slice(a,b);
    }

    function isArguments( item ) {
	return Object.prototype.toString.call( item ) === '[object Arguments]';
    }
    
    var disp = {
	'slice' : slice,
	'parse' : parse,
	'isArguments' : isArguments
	
    };
    return disp;
})(lib);


//$SECTION -LIB.DOM.APPEND
lib.dom.append= (function(lib){
    var disp = {
	'before' : function(e, target){ target.insertBefore(e, target)  },
	'after' : function(e, target){ lib.dom.insertAfter(e, target)  },
	'prepend' : function(e, target){ target.insertBefore(e, target.childNodes[0])  },
	'append' : function(e, target){ target.appendChild(e) },
	
    };
    return disp;
})(lib);

//$SECTION -LIB.APP.BOOTSTRAP.APPEND
lib.app.bootstrap.append = (function(lib){

    let mScript= function (item,opts={}){
	var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
        return lib.dom.create.js(url, item['attrs']);
    };
    let mCss= function (item,opts={}){
	var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
        return lib.dom.create.css(url, item['attrs']);
    };
    let def = function(item,opts={}){
	//console.log('in default',item);
        return lib.dom.create.element(item.tag, item['attrs'],item.content);
    }
    var disp = {
        script : mScript,
        js : mScript,
        css :  mCss,
	link :  mCss,
        'default': def
    };
    return disp;
})(lib);
//$SECTION -LIB.APP.BOOTSTRAP.PLUGIN
lib.app.bootstrap.plugin = (function(lib){


    function registerLib(bs, target,opts){
	if(opts.debug)console.log('in register func', arguments);
	let plugin,regList,pkg;
	plugin = lib.hash.get(lib,target);
	if (!plugin.__REGISTER__){
	    console.log(`no registration information found for plugin ${target}`);
	    return ;
	}
	pkg =opts['plugindst']?opts.dst:lib.utils.toString(plugin['__PLUGIN_PACKAGE__'], {force:1});

	//(!plugin['__PACKAGE__'])?plugin.__PACKAGE__:"";
	
	regList = lib.utils.toArray(plugin.__REGISTER__, /\s+/);
	for (item of regList){
	    console.log(`registering ${item}`);
	    if (!(item in plugin)){
		console.log(`object not found in lib ${target}`);
		continue;
	    }
	    let pluginPath = (lib.utils.isEmpty(pkg)?'':pkg+'.')+item;
	    registerClass(bs,plugin[item], pluginPath,opts);
	    //lib.hash.set(bs.plugins, pluginPath, pluginObj);
	}
	
	
    }
    function registerClass(bs, cls, target,opts){
	console.log('registering class', arguments);

	if (typeof cls !=='function'){
	    console.log('unable to register class, not a function');
	    return;
	}
	let obj = new cls(bs,opts);
	lib.hash.set(bs.plugins, target, obj);
    }

    
    /*
    let mScript= function (item,opts={}){
	var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
        return lib.dom.create.js(url, item['attrs']);
    };
    let mCss= function (item,opts={}){
	var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
        return lib.dom.create.css(url, item['attrs']);
    };
    let def = function(item,opts={}){
	//console.log('in default',item);
        return lib.dom.create.element(item.tag, item['attrs'],item.content);
    }*/
    var disp = {
	registerLib:registerLib,
	registerClass:registerClass
    };
    return disp;
})(lib);


lib.app.bootstrap.remote.wrapper = (function(lib){


    function setLibExec(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let ev,text;
	    text  = req.responseText;
	    if (opts['debug'] ==1)console.log(`inside setlibExec: ${action}`, opts);
	    ev = lib.js.exec(text, {exec:1, eval:doEval?doEval:'indirect'});
	    lib.utils.getFunction(load,1)(req,opts);

	}
	
    }

    function setLib(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let ev,text,target;
	    text  = req.responseText;
	    //console.log('inside setlib: ' +action, opts);

	    ev = lib.js.execLib(text, opts);
	    if (opts['debug']){
		console.log(ev, lib.hash.get(ev,'__PACKAGE__'));
		console.log(text);
	    }
	    //if(action == 'lib')lib.hash.set(lib,dst?dst:lib.hash.get(ev,'__PACKAGE__')?ev.__PACKAGE__:src, ev);

	    if(action.match(/lib|plugin/i)){

		target = dst?dst:lib.hash.get(ev,'__PACKAGE__')?ev.__PACKAGE__:src;
		console.log(`dst =${dst}, package=${ev.__PACKAGE__}, src=${src}`);
		let c = lib.hash.get(lib,target);
		let d = {
		    "l": (l,r) =>{return lib.utils.merge(l,r);},
		    "r": (l,r) =>{return lib.utils.merge(r,l);},
		    "o": (l,r) =>{return r;},
		};
		let behavior = (opts['merge'] &&  opts['merge'] in d)?opts['merge']:'l';		
		if (opts['debug'])console.log(`setting ${target} with behavior ${behavior}`, d[behavior](lib.utils.isHash(c)?c:{},ev));

		if(action.match(/plugin/i ))target='plugin.'+target;
		lib.hash.set(lib,target, d[behavior](lib.utils.isHash(c)?c:{}, ev));
		lib.app.bootstrap.plugin.registerLib(obj,target,opts);


	    }
	    lib.utils.getFunction(load,1)(req,opts,target); // used to be outside if


	}
    }

    function storeJson(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let id = opts['id'] || dst;
	    //console.log(`storing as json (${dst})`);
	    //obj.assets[id]=(id && req && ('responseText' in req))?lib.json.decode(req.responseText): undefined;
	    if(opts.debug)console.log(opts);
	    if (id && req && ('responseText' in req)){
		let rText = opts['strip']?lib.utils.stripComments(req.responseText,opts):req.responseText;
		lib.hash.set(obj.assets,id, lib.json.decode( rText,  {errText:opts['url'],errSpan:20}) );
	    }
	    lib.utils.getFunction(load,1)(req,opts);
	}
	
    }

    function storeText(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let id = opts['id'] || dst;
	    console.log(`storing as text  (${dst}) ,`,id,'<<');
	    //obj.assets[id]=(id && req && ('responseText' in req))?req.responseText: undefined;
	    if (id && req && ('responseText' in req))lib.hash.set(obj.assets,id,req.responseText);
	    lib.utils.getFunction(load,1)(req,opts);
	}

    }
    function attachText(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let id = opts['id'] || dst;
	    console.log(`storing as text  (${dst}) ,`,id,'<<');
	    //obj.assets[id]=(id && req && ('responseText' in req))?req.responseText: undefined;
	    if (id && req && ('responseText' in req)){
		//lib.hash.set(obj.assets,id,req.responseText);
		let e;
		if (e= lib.dom.byId(id)){
		    let result = ""
		    if (opts.attachtype){
			e.innerHTML = (opts.attachtype+"").match(/pre/i)?(req.responseText+e.innerHTML):(e.innerHTML+req.responseText);
		    }else {
			e.innerHTML=req.responseText;
		    }
		}
	    
	    }
	    lib.utils.getFunction(load,1)(req,opts);
	}

    }
    function storeRequest(obj,opts){
	let [src,dst,doEval,load,action,id] = lib.hash.expand(opts, "src dst eval load action dst");
	return function (req,opts){
	    //console.log(`storing as request  (${dst})`);
	    //obj.assets[dst]=(dst && req)?req:undefined;
	    if (dst && req)lib.hash.set(obj.assets,dst,req);
	    lib.utils.getFunction(load,1)(req,opts);
	}
	
    }
    
    function def(obj,opts){
	let [src,dst,doEval,load,action,id] = lib.hash.expand(opts, "src dst eval load action dst");
	return function(req,id){
	    lib.utils.getFunction(load,1)(req,id);
	}
    }
    
	
    var disp = {
	lib:setLib,
	plugin:setLib,
	exec:setLibExec,
	json:storeJson,
	text:storeText,
	req:storeRequest,
	request:storeRequest,
	attach:attachText,
	def:def
    };
    return disp;
	

})(lib);



lib.js =  (function(lib){
    function toLib(text,opts){
	let rv;
	rv = exec(text, opts);
	lib.hash.set(lib,module, rv);

    };

    //makes a dispatch table to collect exports.
    function _makeDispatch(exp,dname='getDispatch'){
	let t = [],text="";
	text = "function "+dname+"(){return {";
	exp =exp?lib.utils.toArray(exp, " " ):[];
	for (let i=0; i < exp.length;i++){
	    t.push( exp[i] +' : '+exp[i]);
	};
	t.push ('__PACKAGE__ :(typeof __PACKAGE__ !== "undefined")? __PACKAGE__:undefined');
	//console.log(t);
	text =  text + t.join(',\n') + '};}';
	//console.log(text);
	return text;
    }

    /*
      parms : parameters of closure
      args : arguments to pass to closure
     */
    function _makeClosure(text, parms=undefined, args=undefined,opts){
	let prepend, postpend,rv;
	opts = lib.args.parse(arguments,{ 'text':"", parms:"",args:""}, "text parms args"); 
        prepend = "(function("+lib.utils.toString(opts.parms,1)+"){";
	postpend = '})('+lib.utils.toString(opts.args,1)+')';
	rv = [prepend , lib.utils.toString(opts.text,1) , postpend].join("\n");
	return rv;
	
    }
    function _makeDispatchCall(name='getDispatch'){
	return "return "+name+"();";
    }

    /*
      text : the code to build the closure around.
      dfunc : insert exporter function, requires export and dname
      dname: exporter function name, requires dname
      dcall : call exporter function
      export : list of exports, space delimited, or array of
      parms : parameters to pass to closure
      args : call the closure with these arguments

      {
        func: 1 | "foo" : if its 1, will use the default name. if its a non empty string, use that. if 0 or undefined, will not prepend exporter function.
	call : 1 :calls exporter function | 0: does not call an exporter function.
	name : name of exporter function.
	
      }
     */
    function dispatchClosure(text, opts){
	let dFunc, dCall,code,exports;
	opts = lib.args.parse(arguments,{ 'text':undefined, dfunc:1, dcall:1, dname:'getDispatch', "export":"",parms:"lib",args:"lib"}, "text export parms args");
	exports = lib.utils.isEmpty(opts['export'])?[]:lib.utils.toArray(opts['export']);
	dFunc = ('dfunc' in opts  )? _makeDispatch(exports,opts['dname']) :""; //&& exports.length
	dCall = ('dcall' in opts)? _makeDispatchCall(opts['dname']):"";
	//code = [dFunc, text,dCall].join("\n");
	if(exports.length){
	    //console.log('FOUND EXPORT',exports);
	}
	//code = [text,dFunc,dCall].join("\n");
	code = [dFunc,text,dCall].join("\n");
	//console.log(dFunc);
	return _makeClosure(code,opts['parms'],opts['args'] );
	
    }

    /*
      1. build a closure or not.
      2. determine eval mode.
      3. eval it.
      4. return the result.

      closure = 1|0
      verbose = 1|0
      dispatchOpts = ...
      eval = "direct|indirect"
      exec(text, "indirect", {export:" "})
      exec(text, modules);
     */
    //$exec
    function exec(text,opts){
	opts = lib.args.parse(arguments,{ 'text':undefined, verbose:1,eval:'direct'}, "text eval verbose");
	//console.log('eval is '+opts.eval + ' '+opts.exec);
	if (opts.exec){
	    code = opts.text;
	}else{
	    code = dispatchClosure(opts.text,opts);
	}
	//if(opts['debug'])console.log(code);
	//console.log(opts);
	let ev = undefined;
	let errorHeader = "ERROR:\nfile:"+opts['base']+opts['desc']+"\n";
        try {
	    ev = (lib.utils.toString(opts.eval,{lc:1, force:1}) == 'indirect')?(0,eval)(code):eval(code);
	    //console.log('here');
	    //console.log(ev);
        } catch (e) {
	    console.log(errorHeader,e);
	    eval('try { ' + code + ' } catch(err) { console.log("!!!>>"+err); }');
            if (e instanceof SyntaxError) { //  && opts.verbose
                //console.log(e.message,e.stack);
            }else {
		//console.log('there was an unspecified error loading this file ',e);
	    }
        }
	return ev;

    }

    /* 
       front end with presets for loading a lib.
       execLib(text, "exports go here");
       */
    function execLib(text, exports, opts){
	opts = lib.args.parse(arguments,{ 'text':undefined, verbose:1,eval:'indirect'}, "text export");
	opts = lib.utils.merge(opts, {exec:0});
	//console.log(`OPTS :`,opts);
	return exec(opts.text, opts);
    }

    var disp = {
        lib: toLib,
        exec: exec,
	execLib: execLib,
	_dispatch:_makeDispatch,
	_closure: _makeClosure,
	dispatchClosure:dispatchClosure,
	
        default: exec
    };
    return disp;


})(lib);



lib.app.load.apply = (function(lib){
    let toJSON = function(req){
        obj.assets[opts.id] = lib.json.decode(req.responseText);
	
    };
    let toText = function(req){
	return req.responseText;
    };
    let def = function(req){
	return req;
    };

    var disp = {
	json: toJSON,
	text: toText,
	default: def
    };
    return disp;
	

})(lib);

//$lib.sync.controller
lib.sync = (function(lib){
    class syncLoader {
	constructor(opts = {}) {

	    opts = lib.args.parse(arguments,{ 'load':undefined}, "load prepend require"); //lib.args.slice(arguments,1)
	    this.controller = {check:{}, run:{},lock:undefined};
	    this.onLoad = lib.utils.getFunction(opts.load);
	    this.prepend = opts.prepend;

	    this.require(opts.require);

	}

	require(id){
	    id = lib.utils.toArray(id, /\s+/);
	    for (let i in id){
		this.controller.check[id[i]] = 1;
	    }
	    return 1;
	}
	set(id) {
	    //console.log('>>setting '+id,this.controller);
	    if (!(id in this.controller.check))return 0;
	    this.controller.run[id]= 1;
	    if (this.loaded()){
		if (!lib.utils.isEmpty(this.controller.lock)) {
		    //console.log('locked by' + id);
		    return 0;
		} //fix later with promise
                this.controller.lock=id;
		//console.log('>>MADE HERE');
		lib.utils.getFunction(this.onLoad,1)(this.prepend, id, ...lib.args.slice(arguments,1));
		return 1;
	    }
	    return 0;
	}
	
	loaded (id=undefined){
	    if (id){
		if (!(id in this.controller.check))return 0;
		return  (this.controller.run[id] == 1)?1:0;
	    }
	    for (k in this.controller.check){
                if (this.controller.run[k] !=1){
                    //console.log('returning from id:'+k+' / '+this.controller.run[k]);
		    return 0;
                }
            }
	    return 1;
	    
	}

	//require an id, and run it when its triggered.
	wrapper(id,itemHandler) {
	    this.require(id);
	    let obj = this;
	    return function(){
		//console.log('firing wrapper with ',arguments);
		lib.utils.getFunction(itemHandler,1)(...arguments);
		obj.set(id);
	    }
	}
	
	
    }

    var disp = {
	controller : syncLoader
    };
    return disp;
})(lib);

lib.func =  (function(lib){
    function wrapper(fun){
	fun = lib.utils.getFunction(fun);
	if(!fun)return undefined;
	args = lib.args.slice(arguments,1);
	return  function (){
	    let fullArgs = lib.args.slice(arguments).concat( args);
	    fun(...fullArgs);
	}
    }

    /* in progress. check pre/postWrap for now
      chain("foo"|foo, ...args);
      chain("foo bar"|[foo,bar], ...args);
      chain({f:funs, e:err,t:test,a:args      });
      chain("istring lower, match", "$rv");
    */


    /*
      preWrap(funs, args); postWrap(funs, args);
      wraps a list of functions with predefined vars, returns a wrapper
      to be called with additional arguments, (usually an event Handler)
      ex: req.onclick = preWrap("writeComment updateValue", {})(this);
          addEventListener('click',preWrap("writeComment updateValue",{}););

      note: eventually after figuring out an intuitive parameter format,
            all will be merged into 'chain'
     */

    
    function postWrap(funs){
	let args,wrap;
	args = lib.args.slice(arguments,1);
	funs = lib.array.to(funs,/\s+/);
	wrap = function(){
	    let rv = undefined,name=undefined;
	    for (fun of funs){
		//name=(typeof(fun) == 'string')?fun:"anon fucc"
		let fullArgs = lib.args.slice(arguments).concat( args);
		fun = lib.utils.getFunction(fun);
		if(!fun)return undefined;

		rv = fun(...fullArgs);
            }
	    //console.log('PW returning',rv,name);
	    return rv;
	}
	return wrap;
    }
    
    function preWrap(funs){
	let args,wrap;
	args = lib.args.slice(arguments,1);
	funs = lib.array.to(funs,/\s+/);
	wrap = function(){
	    let  rv=undefined;
	    for (fun of funs){
		//let fullArgs = lib.args.slice(arguments).concat( args);
		let fullArgs = args.concat( lib.args.slice(arguments));
		fun = lib.utils.getFunction(fun);
		if(!fun)return undefined;

		rv = fun(...fullArgs);
            }
	    return rv;
	}
	return wrap;
    }


    //clean this up to provide better info
    function name(){
	let stack = new Error().stack,
            caller = stack.split('\n')[2].trim();
	return caller;
	
    }

    
    var disp = {
	name : name,
	wrapper : wrapper,
	postWrap: postWrap,
	preWrap: preWrap,
	get : lib.utils.getFunction
    };
    return disp;
})(lib);
    
lib._http = (function(lib){
    let get = function(url, opts){
	opts = lib.utils.toHash(opts);
	if (opts.debug)console.log('opts', opts);
	let req = new XMLHttpRequest();
	let method = lib.hash.get(opts,'method',"GET") ;
	//4/16/24 -- added with credentials.
	if(opts['credentials'] == true){
	    req.open(method,url,true);
	    req.withCredentials = true;
	}else req.open(method,url);
	req.onreadystatechange = function () {
	    if(req.readyState === XMLHttpRequest.DONE){
		//console.log('received data. status='+req.status, opts);
		if (req.status >=400)lib.utils.getFunction(opts['error'],1)(req);
		else lib.utils.getFunction(opts['load'],1)(req);		

		//if (lib.utils.getFunction(opts['load'])) opts['load'](req);
		/*
		if (req.status === 200) {
		    console.log('received data');
		    success(req);
		}else{
		    console.log('error getting data');
		    failure(req);
		}*/
	    }
	};
	req.send(lib.hash.get(opts,'body'));
    }
    function _request(url, opts){
	opts = lib.utils.toHash(opts);
	//if (opts.debug)console.log('opts', opts);
	let req = new XMLHttpRequest();
	
	let method = lib.hash.get(opts,'method', "GET") ;
	let headers = lib.utils.toArray(opts.header);
	//4/16/24 -- added with credentials.
	if(opts['credentials'] == true){
	    req.open(method,url,true);
	    req.withCredentials = true;
	}else req.open(method,url);
	
	if(opts.urlencoded)req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	for (i of headers){
	    if (lib.hash.is(i)){
		req.setRequestHeader(i['name'],i['value']);
	    }
	}
	req.request={
	    url: url,
	    body: lib.hash.get(opts,'body')
	};
	req.onreadystatechange = function () {
	    if(req.readyState === XMLHttpRequest.DONE){
		//console.log('received data. status='+req.status, opts);
		if(opts.json==1)req.jsonData = lib.json.parse(req.responseText+"");
		if (req.status >=400)lib.utils.getFunction(opts['error'],1)(req);
		else lib.utils.getFunction(opts['load'],1)(req);		
	    }
	};
	if (opts.debug ){
	    console.log('sending',opts,req);
	}
	req.send(lib.hash.get(opts,'body'));
    }
    function post(url,opts){
	opts = lib.utils.toHash(opts);
	opts.method='POST';
	return _request(url,opts);
    }
    var disp = {
	get: get,
	post: post,
	request: _request
	
    };
    return disp;
})(lib);




lib.json = (function(lib){

    //decodes text into obj.
    function decode(text, opts){
	let rec;
	opts = lib.args.parse(arguments,{verbose:1, text:undefined,errSpan:10}, "text"); 
	try {
            rec = JSON.parse(opts.text);
        } catch (e) {
            if (opts.verbose && e instanceof SyntaxError) {
		let rem = e.message.substr(e.message.toLowerCase().indexOf("position ") );
		let patt = /position (\d+)/i;
		//e.message.substr(e.message.toLowerCase().indexOf("position ") ).
                console.log(`error parsing json ${opts['errText']?['(',opts['errText'],')'].join(''):''}\n`, e.message,rem);
		let pos = 0;
		if (match =  patt.exec( e.message)){
		    if (match.length > 1)
			pos = match[1];
		}
		if (!lib.utils.isEmpty(pos)){
		    //console.log(`textlengh=${text.length}, pos=${pos}`);
		    console.log(text.substr(pos-opts.errSpan>0?pos-opts.errSpan:0, opts.errSpan*2)); //pos+10<text.length?pos+10:undefined
		}

		//text.substr(
            }
            rec = undefined;
        }
	return rec;
    }

    //encodes a json string from an object.
    function encode(obj, opts){
	let text;
	opts = lib.args.parse(lib.args.slice(arguments,1),{verbose:1, obj:undefined}, ""); 
	try {
            text = JSON.stringify(obj);
        } catch (e) {
            if (opts.verbose && e instanceof SyntaxError) {
                console.log("error encoding json\n", e.message);
            }
            text = undefined;
        }
	return text;
    }
    
    var disp = {
	stringify: encode,
	encode: encode,
	decode: decode,
	parse: decode,

    };
    return disp;
    

})(lib);



lib.hash = (function(lib){
    //console.log('installing lib.hash');
    /*lifted from medium because I'm lazy to write my own.
      https://medium.com/javascript-in-plain-english/how-to-deep-copy-objects-and-arrays-in-javascript-7c911359b089
      WTF is with people not using semi colons.
    */
    function deepCopy(inObject,opts={}) {
	let outObject, value, key;
	opts = lib.utils.toHash(opts);
	if (typeof inObject !== "object" || inObject === null) {
            return inObject // Return the value if inObject is not an object 
	}
	//if (isHash(obj)!inObject.constructor.name.match(/^Object$/i)){ 
	if(opts['force'] != 1 && typeof inObject === "object" && !(inObject instanceof Element) && !lib.utils.isArray(inObject) && !lib.utils.isHash(inObject)){
            console.log('not traversing, its probably a class '+inObject.constructor.name);
            return inObject; //(dont copy classes);
	}else {
            //console.log('will try ' +inObject.constructor.name);
	}
	/*
	  if(typeof inObject === "object" && !isDom(inObject) && !isArray(inObj) && !isHash(inObj)){ 
	  console.log('not traversing, its probably a class '+inObject.constructor.name);
	  return inObject; //(dont copy classes); 
	  }
	*/
	// Create an array or object to hold the values

        
	outObject = Array.isArray(inObject) ? [] : {};

	for (key in inObject) {
            value = inObject[key];
            // Recursively (deep) copy for nested objects, including arrays 
	    outObject[key] = deepCopy(value);
	}

	return outObject;
    }


    function hashOr(k, hash, def){
	if (k in hash) return hash[k];
	return def;
    }

    function merge (left , right,opts = undefined){

	if (!( lib.utils.isHash(left) && lib.utils.isHash(right))) return undefined;
	var left = deepCopy(left);
	var right = deepCopy(right);

	var hmap = {'array': 'a', 'object':'h'};
	//(isHash(opts) && ('disp' in opts))?opts.disp:
	if ( typeof merge.disp == 'undefined' ){
            merge.disp =  {
		hh: function (l,r){return merge(l,r,opts);},
		as: function (l,r){l.push(r); return l;},
		aa: function (l,r){return l.concat(r);},
		'default': function (l,r){return r;}
            };
	}

	//var disp =merge.disp;
	var disp = ( lib.utils.isHash(opts) && ('disp' in opts) )?{...merge.disp, ...opts.disp}:merge.disp;
	for (var p in right){
            var type = hashOr(lib.utils.baseType(left[p]), hmap, 's') + '' + hashOr(lib.utils.baseType(right[p]),hmap,'s');
            //console.log(type+ " " +p) ; 
            if (!(type in disp)) type= 'default';
            left[p]=disp[type](left[p],right[p]);

	}
	return left;
    }



    
    function hashGet(E, prop, def=undefined){
	//convert prop to array
	//if (prop == 'runEvents')  console.log('getting ' + prop + 'def = '+def);
	
	if (lib.utils.baseType(E,'object')) {
            var parts =  lib.utils.toArray(prop,'.');
            if (parts){
		
		var ptr = E;
		for (var i =0; i < parts.length; i++){
                    var item = parts[i];
                    //console.log ('item is ' + item);
                    var Type = lib.utils.baseType(  ptr[item] );
                    if (lib.utils.baseType(  ptr[item], 'object')) {
			ptr = ptr[item];
                    }else {
			if (i < parts.length -1 ){
                            //console.log('cannot get property. unable to traverse object deeper at [\''+item + '\'] ... type is not object (' +Type+')'  ); //+ 'caller='+hashGet.caller
                            return def ;
			}else {
                            //if (prop == 'runEvents')       console.log ('here ' + item);
                            if (ptr[item] === undefined)return def;
                            return ptr[item];
			}

                    }
		}
		return ptr;
            }else {
		console.log('wasnt able to parse array from prop: '+prop);
		return def;
            }
	}else {
            //console.log('e is not an object'+ E + ' prop '+prop);
            return def;
	}
    }


    /*

    //legacy hash set. cannot do destructive setting. ironically, it works amazingly well on the dom tree where the new sauce doesn't.

      sets a property within the hash. uses the same property methodology  as getProperty.
      
      if a intervening hash key does not exist, it will not be created and will return 0
      else, returns 1 (success)
    */


    function legacySet(E, prop, value){
	//console.log('value is '+value);
	if (lib.utils.baseType(E,'object')) {

	    var parts = lib.utils.toArray(prop,'.');
	    if (parts){
		var ptr = E;
		parts.forEach (function(item,index) {
		    var Type = lib.utils.baseType(  ptr[item]);
		    //console.log(item + ' ' + Type);
		    if (lib.utils.baseType(  ptr[item], 'object')) {
			ptr = ptr[item];
		    }else {
			if (index < parts.length -1 ){
			    console.log('cannot set property. unable to traverse object deeper at [\''+item + '\'] ... type is not object (' +Type+')' );
			    return 0;
			}else {
			    ptr[item] = value;
			    return 1;
			}
		    }
		    
		    
		} );

		
	    }else {
		console.log('wasnt able to parse array from prop: '+prop);
		return 0;
		E[prop] = value;
		return 1;
	    }
	}else {
	    return 0;
	}
    }

    /*
      supports destructive assignments and creation of new keys.
      will not work on the dom tree in all cases, b/c certain properties are actually functions, and cannot accept a hash assignment.
      legacySet DOES WORK. b/c it crawls the tree.
    */
    
    function hashSet(rec, prop, value,opts){
	//console.log('value is '+value);
	prop = lib.utils.toArray(prop,'.');
	if (!prop.length)return value;
	if (!lib.utils.baseType(rec, 'object'))rec = {};


	key = prop[0];
	if (prop.length > 1){
            let nRec = (key in rec)?rec[key]:{}; //  exists($rec->{$tKey})?$rec->{$tKey}:{};
            if (!lib.utils.baseType(nRec, 'object')) nRec = {};
            rec[key] = hashSet(nRec, prop.slice(1) ,value,opts); //[@$target[1..$tLen-1]
	}else{
            rec[key] = value;
	}

	return rec;

	
    }

    function expand(opts, exp){
	
	opts = lib.utils.toHash(opts);
	exp = lib.utils.toArray(exp, " ");
	rv = [];
	for (i in exp){
	    rv.push(opts[exp[i]]);
	}
	return rv;
    }

    function hashAppend(input, pre="",post="",key=0){
	let list , output={};
	if(!lib.hash.is(input))return undefined;

	list = Object.keys(input);
	console.log(list);
	for (let i of list){
            if (key)    output[pre+i+post]=input[i];
            else  if (lib.utils.baseType(input[i], ["string","number"])) output[i] = pre+input[i]+post;
            else output[i]=input[i];


	}
	return output;
    }

    //attach functions, private variables etc to make your life easier.
    function getContext (context, target)
    {
        if(lib.utils.isEmpty(target))return undefined;
        if(lib.hash.is(target))return target;
        //let [a,b] = lib.utils.toString(target,1).toLowerCase().split(':',2);
	let [a,b] = lib.utils.toString(target,1).split(':',2);
        //console.log(`a : ${a}, b: ${b}`);
        const rec = lib.hash.get(context,a);
        if(!b){
            return rec;
        }
        return lib.func.get(rec)?
            lib.func.get(rec,true)(b):
            lib.hash.get(rec, b);
    }    
    var disp = {
	get: hashGet,
	set: hashSet,
	legacySet: legacySet,
	expand: expand,
	to : lib.utils.toHash,
	is : lib.utils.isHash,
	append:hashAppend,
	merge:merge,
	getContext:getContext
	
    };

    return disp;
    

})(lib);

var currentScript = document.currentScript;
//$SECTION - BOOTSTRAPPER
class bootStrapper {

    constructor(opts = {}) {
	let success,failure;
	this.sOpts= lib.utils.isHash(opts)?opts:{};
	//this.sConfs=lib.utils.toArray(confs);
	this.keywords = {
	    'test':1
	};
	this.base =this.sOpts['base'] || './';
	this.repo =this.sOpts['repo'] || 'https://js.m7.org/';
	this.defaultTarget = document.getElementsByTagName("head")[0];
	this.dom = new domManager();
	this.dom.track(currentScript, this.sOpts['currentScript']);
	this.assets = {};
	this.ws = {}; //for passing shit around in case you dont want to pollute assets with non downloads.
	this.plugins = {};
	this.defaults = {
	    load: function (r,opts){console.log('loaded: '+lib.hash.get(r, "responseURL")+(lib.utils.isEmpty(arguments[2])?'':`\ntarget: ${arguments[2]}`) )},
	    error: function (r,opts){
		try {
		    console.log(`error loading :`+lib.hash.get(r,"responseURL")+`\nstatus: `+
				lib.hash.get(r,"status") + " " +lib.hash.get(r,'statusText'),arguments);
		}catch(err){
		    console.log(err);
		    console.log('error loading:',arguments);
		}

	    }
	};
	//bs.append('framework/lib/js/utilsGeneral.js', {target:document.head, tag:'script', attrs:{load:function(){console.log('hello world')}}});
	//bs.append('framework/lib/js/utilsGeneral.js', {target:document.head, tag:'script'});

	success = function(obj){
	    return function(req){
		//console.log('successfully loaded',arguments);
		//obj.assets[
	    };
	}(this);
	failure = function(obj){
	    return function(req){
		console.log('error loading');
	    };
	}(this);
	this.apply(this.repo+'legacy/www.js', 'lib', "httpTool","_www", success );// {dst:'_www',load:success, export: ['httpTool']});
	
    }

    
    // parse confs

    /*
      if list item is a url or keyword.
     */
    _parsePackage(list = []){
	//parses the list of assets.
	list  =lib.utils.toArray(list);
	//loop through each item and turn it into an object. (package?)
	let pList = [];
	let ext = 0;
	let loopFunc = function(item, index){
	    let iType = lib.utils.linkType(item);
	    if(!iType) return;
	    if (this.isPackageKeyWord(item)){
		//collect the package from keywords;
		pList.push(this.getPackage(item));
	    }else if (iType =='relative' || iType =='absolute'){
		//make a package.
		let pkg = {
		    src: [item]
		};
		pList.push(pkg);
	    }else{
		
		//convert from pointer link to package if necessary
	    }
	}
	list.foreach(loopFunc);

    }

    
    
    //runs the queue and inserts tags / downloads assets.
    load(confs = []){
	//loop through tags. and process
	//loop through assets and process
	
	
    }

    //catches the status of the start requests.
    load_callback(){
	
    }


    _isPackageKeyWord(item){
	let keywords = this.keywords;
	let tb = this.tb;
	return  (item in  this.keywords)?1:0;
    }



    
    
    _prepareCSS(inList=[],opts={} ){
	let list = [];
	inList=lib.utils.toArray(inList);opts= lib.utils.isHash(opts)?opts:{};
	for ( let i=0 ,item = inList[i];i<inList.length;item=inList[++i]){
	    let rec,conOpts, rtOpts;  let iType = lib.utils.linkType(item);
	    if(!iType)return;
	    if (iType != 'hash'){
		rec = {    href: item};
	    }else{
		//console.log('item is ',item);
		//rec = item;
		rec = lib.utils.deepCopy(item);
	    }

	    if (lib.utils.linkType(rec['href'], ['hash',undefined]))continue;
	    conOpts ={
		base : opts.base || this.base,
		target:opts.target,
		mode: opts.mode
	    };
	    rtOpts = lib.utils.hashStrip({
		base: opts.base,
		target: opts.target,
		mode: opts.mode 
	    });
	    rec = lib.utils.merge(conOpts, rec);
	    rec = lib.utils.merge(rec,rtOpts);
	    list.push(rec);
	};
	return list;
	
    }

    
    /*map , req
      map: {href:url, src:url}
      req: "url"
     */
    //merge options order: default config -> rec -> runtime
    _prepareList(inList=[],opts={} ){
	let list = [];
	inList=lib.utils.toArray(inList);opts= lib.utils.isHash(opts)?opts:{};
	for ( let i=0 ,item = inList[i];i<inList.length;item=inList[++i]){
	    let rec,conOpts, rtOpts;  let iType = lib.utils.linkType(item);
	    if(!iType)return;
	    if (iType != 'hash'){
		rec = { url: item};
	    }else{
		rec = lib.utils.deepCopy(item);
		if (!('url' in rec)) rec.url = lib.utils.hashOr(['src','href'], rec);
	    }
	    
	    //if (lib.utils.linkType(rec['url'], ['hash',undefined]))continue;
	    conOpts ={
		base : this.base,
		target: this.defaultTarget,
	    };
	    rtOpts = lib.utils.hashStrip({
		base: opts.base,
		target: opts.target,
		mode: opts.mode,
		tag : opts.tag
	    });
	    //console.log('rt opts:', rtOpts);
	    rec = lib.utils.merge(conOpts, rec);
	    //console.log('conf/rec:', rec);
	    rec = lib.utils.merge(rec,rtOpts);
	    //console.log('rec:', rec);
	    if ( !(lib.utils.hasKeys(rec,lib.utils.toArray(opts.req))))continue;
	    list.push(rec);
	};
	return list;
	
    }


    /*
      url/src/hrer
      base
      target
      tag
      mode
     */
    _prepareCreate(item,opts){
	//let rec,conOpts, rtOpts;  let iType = lib.utils.linkType(item);
	let rec;
	if (!lib.utils.isHash(item))return undefined;
	rec = lib.utils.deepCopy(item);
	if (!('url' in rec)) rec['url'] = lib.utils.hashOr(['src','href'], rec);
	if('load' in rec)lib.hash.set(rec,'attrs.load', rec['load']);
	if('error' in rec)lib.hash.set(rec,'attrs.error', rec['error']);
	rec['base'] = rec['base'] || this['base'];
	rec['target'] = rec['target'] || this['defaultTarget'];
	if ( !(lib.utils.hasKeys(rec,lib.utils.toArray(opts.req))))return undefined;
	return rec;
    }

    
    //needs a url, tag, target
    //url tag, target, mode, item
    //$createElement
    createElement(url,tag, target, load,error, item){
	let tagFunc,base;
	item = lib.args.parse(arguments,{url:undefined,target:undefined, tag:undefined, mode:undefined,base:undefined,track:undefined}, "url tag target load error");
	item = this._prepareCreate(item,{req:['tag']});
	if (!item) return 0;
	target = lib.dom.getElement(item.target);
	if (!target) return 0;
	base = item['base']?item['base']:this.base?this.base:"";
	url = lib.utils.linkType(item.url,'relative')?base+item.url:item.url;

	//url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
	tag = lib.utils.lc(item.tag);
	tagFunc = (tag in lib.app.bootstrap.append)?tag:'default';
	//console.log(`loading ${url} ${tag} : `, tagFunc);
	//console.log('createElement:using base ' + base + ' , url '+url);
	var e = lib.app.bootstrap.append[tagFunc](item);
	
	if (!e){
	    console.log('unable to create element ',item);
	    return 0;
	}

	//console.log(`tracking and attaching ${target}, ${item.mode}`);
	this.lastE = e;
	this.dom.track(e,item['track']);
	this.dom.attach(e, target, item['mode']);
	return 1;
    }
    
    
    //appends elements to dom.
    //$append
    append(inList=[], opts={}){
	let list = this._prepareList(inList, lib.utils.merge(opts,{req:['tag']}));

	for ( let i=0 ,item = list[i];i<list.length;item=list[++i]){
	    console.log('item is',item);
	    let target = lib.dom.getElement(item.target);
	    //console.log('here');
	    if (!target) continue;
	    
	    var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
	    let tagName = lib.utils.lc(item.tag);
	    console.log(`loading ${url} ${tagName} : `, (tagName in lib.app.bootstrap.append)?tagName:'default');
	    
	    var e = lib.app.bootstrap.append[(tagName in lib.app.bootstrap.append)?tagName:'default'](item);
	    
	    if (!e){
		console.log('unable to create element ',item);
		continue;
	    }

	    console.log(`tracking and attaching ${target}, ${item.mode}`);
	    this.lastE = e;
	    this.dom.track(e,item['track']);
	    this.dom.attach(e, target, item.mode);
	    
	}
    }
    
 

    /*
      url: url
      load: handler for load
      error: handler for error
    */
    //$request
    request(url, load, error, opts){
	let wrapper,id, store;
	opts = lib.args.parse(arguments,{url:undefined,load:undefined, error:undefined,method:'GET', body:undefined}, "url load error");
	
	wrapper = function(obj,func, opts){
            return function(req){
		lib.utils.getFunction(func,1)(req,opts);
            };
        };
	load = wrapper(this,opts.load,opts);
	error = wrapper(this,opts.error,opts);
        lib._http.get(url, {load:load,error:error,method:opts.method,body:opts.body});
    }

  

    
    /*
      apply == applyRequest

      apply(src, apply, load,dst,opts)
      apply(src, apply, exports, load,dst, opts)
      apply("json.js", "json", onload, opts)
      apply("lib.utils", "lib", "exports", onload, opts);
    */
    //$apply
    apply(desc, action,exports, opts){
	return this.applyRequest(...arguments);
    }

    //$applyRequest
    applyRequest(desc, action,exports, opts){
	let load,error,url,base,param;
	action = lib.utils.toString(arguments[1],{lc:1, force:1}); //check to see if short hand was used...
	action = lib.utils.toString(action,{lc:1, force:1});
	    
	param = `desc action ${action.match(/lib|plugin/i)?"export":""} dst load error`;
	//console.log(`param = ${param}`);
	opts = lib.args.parse(arguments,{'desc':0,'type':'export'},param);
	//console.log('applying request...',opts);
	action = lib.utils.toString(opts.action,{lc:1, force:1});

	if (opts['nowrap'] == true){ //this is for loadPackage, it needs to wrap over this.
	    load = opts['load'];
	    //console.log('in nowrap',load);

	}else {
	    //console.log(`here ${action} ${desc}`);
	    //if (!('load' in opts))opts['load'] = this.defaults['load'];
	    //load = lib.app.bootstrap.remote.wrapper[(action in lib.app.bootstrap.remote.wrapper)?action:'def'](this,opts);
	    load=this.wrapLoad(opts);
	}
	error = opts.error || this.defaults['error'];
	//url = lib.utils.linkType(opts.desc,'relative')?(this.base?this.base:"")+opts.desc:opts.desc;
	base = opts['base']?opts['base']:this.base?this.base:"";
	url = lib.utils.linkType(opts.desc,'relative')?base+opts.desc:opts.desc;
	//console.log('using base ' + base + ' , url '+url,opts);
	console.log(`request(${action}) ${url} `+ (opts['dst']?`as ${opts['dst']}`:""));
	this.request(url, load, error,opts); //opts.desc
	return ;
    }

    //$plugin
    plugin(target,opts){
	let plugin, func;
	[target, func] =target.split('::');;
	if (lib.utils.isEmpty(func) ) func = "main";
	if (plugin = lib.hash.get(this.plugins,target)){
	    if (typeof plugin[func] === 'function'){
		console.log(`running ${target}.${func}`);
		plugin[func](...lib.args.slice(arguments,1,undefined));
	    }else {
		console.log(`not a function: ${target}.${func}`);
	    }
	}else {
	    console.log(`plugin not found (${target})`);
	    return;
	}
	
    }

    registerPlugin(cls, target, opts){
	lib.app.bootstrap.plugin.registerClass(bs,cls, target , opts);
    }
    //runs a sequence of actions.
    runSequence(list,opts){
	//console.log('running sequence...');
    }

    /*
      hash of parms, or array of hash
      [
      {
        loadid: xyz,
	
        load: [
	
	],
	run: [
	
	]
	}
      ],{...}
     */
    loadPackage(pkgList,opts){
	pkgList = lib.utils.toArray(lib.utils.deepCopy(pkgList));
	opts = lib.utils.toHash(opts, {def:{overwrite:0}});
	let pkg, loadList,requests,tags,tagOpts, prepend, pkgHandler,runWrapper,runSequence =0,runEvents,eRun=0;
	pkg = pkgList.shift(0);
	console.log('OPTS IS', opts);
	runEvents = function(pp){
	    let events = lib.hash.get(pp, "pkg.event");
	    events = lib.utils.baseType(events, ['string','array'])?lib.utils.toArray(events):undefined;
	    if(!events)return 0;
	    lib.event.set(events);
	    return 1;
	}

	runWrapper = function(pp,list,pkgs,opts){
	    return function(){
		//console.log('in run wrapper',arguments,'-----',pp);
		
		for (let i=0; i < list.length;i++){
		    //console.log(`list i=${i} (${list[i]}`);
		    let fname = lib.utils.baseType(list[i],'string')?list[i]:
			(lib.utils.baseType(list[i],'function') && list[i].name)?list[i].name:'anonymous function';
		    
		    console.log(`>>running[load] ${fname}`);
		    if (lib.utils.baseType(list[i],'string') && list[i].toLowerCase() == 'runevents'){
			runEvents(pp);
			eRun = 1;
		    }else
			lib.utils.getFunction(list[i],1)(pp);
		}
		if(!eRun)runEvents(pp);
		if(pkgs.length)pp.bs.loadPackage(pkgs,opts);
	    }
	}

	/*beging current items : split off the items we are working on right now.*/
	//pkgBase = lib.hash.get(pkg,"base") || this.base;
	loadList=lib.utils.toArray(pkg['load']);
	console.log('>>loadlist:',loadList);
	requests = lib.utils.toArray(lib.hash.get(pkg, 'request.items')); //used to be cLib
	tags = lib.utils.toArray(lib.hash.get(pkg, 'tag.items')); //used to be append
	tagOpts = lib.utils.toHash(lib.hash.get(pkg, 'tag.opts'));

	//console.log('load list:'+loadList.length);
	/*end current items*/
	prepend = {bs:this,lib:lib, pkg:pkg};
	//loadlist = current functions to run, pkgList = remaining packages.
	pkgHandler = runWrapper(prepend,loadList,pkgList,opts); //runlist

	if (!requests.length && !tags.length){
	    pkgHandler();
	    return 1;
	}

	{
	    let controller = new lib.sync.controller(pkgHandler, prepend);
	    
	    let missed = 0;
	    if(requests.length){
		for (let i=0; i < requests.length;i++){
		    let itmHandler, dst, action;
		    action = lib.utils.toString(requests[i]['action'],{force:1, lc:1});
		    requests[i]['nowrap'] =true;
		    itmHandler = this.wrapLoad(requests[i]);
		    if(!requests[i]['overwrite'] && !opts['overwrite'] &&  action.match(/lib/) && requests[i].dst && lib.hash.get(lib, requests[i]['dst'])){
			console.log(`already LOADED LIB ${requests[i]['desc']} - `,opts);
			missed++;
			continue;
			
		    }else if (!opts['overwrite'] && requests[i]['dst'] && lib.hash.get(this.assets, [requests[i]['dst']])){
			console.log('ALREADY STORED '+requests[i]['desc']);
			missed++;
			continue;
		    }


		    lib.hash.set(requests[i], 'load', controller.wrapper('request'+i,itmHandler ));
		    //console.log('passing to applyrequest', requests[i]);
		    this.applyRequest(lib.utils.merge({base:pkg['base']},requests[i]));
		}

	    }
	    //console.log('onto tags...',tags.length);
	    if(tags.length){
		for (let i=0; i < tags.length;i++){
		    let itmHandler = lib.hash.get(tags[i],'load');
		    //console.log('checking '+tags[i]['track']);
		    if(!opts['overwrite'] && tags[i]['track'] && this.dom.lookup(tags[i]['track'])){
			console.log('ALREADY ATTACHED ',tags[i]);
			missed++;
			continue;
		    }
		    lib.hash.set(tags[i], 'load', tags[i]['rload']==0?itmHandler:controller.wrapper('tag'+i,itmHandler ));
		    this.createElement(lib.utils.merge({base:pkg['base']},tags[i]));
		}

	    }
	    if (missed >= tags.length+requests.length)pkgHandler();;

	}
	
    
	return 1;
    }
    wrapLoad(opts){
	let load;
	//opts['load']= lib.hash.get(opts,'load') || this.defaults['load'];
	if (!('load' in opts))opts['load'] = this.defaults['load'];
	//console.log('itm handler1', opts['load']);
	//console.log('wrapping',opts);
	let action = (opts['action'] in lib.app.bootstrap.remote.wrapper)?opts['action']:'def';
	load = lib.app.bootstrap.remote.wrapper[(opts['action'] in lib.app.bootstrap.remote.wrapper)?opts['action']:'def'](this,opts);
	//console.log(`it handler2 ${opts['action']} - ${action}`, load);
	return load;
	
    }
}
//manages tracking of resources
//$SECTION - DOMMANAGER
class domManager{
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
    
    makeID(id){
	let runs = 0;
	if (id){
	    if (typeof(id) != 'string' && typeof(id) != 'number')return undefined;
	    if( this.tracker[id])return undefined;
	    return ""+id;
	}
	while(runs++ < this.runMAX){
	    let id = this.counter++;
	    if (!this.tracker[""+id])return id;
	}
	return undefined;
    }
    track (e, opts = {}){
	let id, rec = this.lookup(e);
	if (!e || rec  )return 0;
	if (typeof(opts) == 'string' || typeof(opts) == 'number') opts = {id:""+opts};
	if (typeof(opts) != 'object')opts=={};
	id = this.makeID(opts.id);
	if (id ===undefined)return 0;
	rec = {
	    e: e,
	    id : id,
	    dom: 1,
	    display: undefined,
	    user: opts.user || {}
	};
	this.tracker[id] = rec;
	return 1;
    }

    //stops tracking an element.
    release(e){
	let rec= this.lookup(e);
	if (!rec)return 0;
	delete this.tracker[rec.id];
	return 1;
    }

    //finds an element by dom, tagid or target
    findTarget(e,defTarget=undefined){
	if (lib.dom.isDom(e))return e;
	if (e && lib.utils.isScalar(e)){
	    e = lib.utils.toString(e);
	    if (e.match(/^\$/)){
		let f = this.lookup(e.substr(1));
		if (f)return f.e;
	    }else return lib.dom.byId(e);
	}
	return this.findTarget(defTarget);
    }
    
    //returns a tracked based on id or element
    lookup(e,order = []){
	//if (!e) return undefined;
	if (e instanceof Element){
	    let list = Object.keys(this.tracker);
	    for (let i = 0,item = this.tracker[list[i]];i < list.length;item=this.tracker[list[++i]]){
		if (item.e == e)return item;
	    }
	}else if ((typeof(e) == 'string' || typeof(e) =='number') && e !==undefined) {
	    if (this.tracker[""+e]) return this.tracker[""+e];
	}
	return undefined;
    }

    //sets style.display to x
    display(e,display){
	let rec= this.lookup(e);
	if (!rec)return 0;
	rec.e.style.display = rec.display = display || "";
	return 1;
    }

    //removes from dom tree. keeps a pointer to the element in case you want to move it somewhere else
    detach(e,release){
	let rec= this.lookup(e);
	if (!rec)return undefined;
	//console.log('detaching...');
	e= lib.dom.removeElement(rec.e);
	if (e) {
	    rec.dom=0;
	    if (release==1)this.release(rec.id);
	    return e;
	}
	return undefined;
    }
    
    //attaches an element somewhere else if you want.
    attach(e,target=undefined,subTarget=undefined){
	let rec= this.lookup(e);
	if (!rec){console.log('rec',e ,'not found...');return 0;}
	//if(rec.dom==1)return 0;
	target = target?this.findTarget(target):document.getElementsByTagName("head")[0];
	//console.log('attach target is ', target);
	if (!target) return 0;

	subTarget = (!lib.utils.isEmpty(subTarget) && lib.utils.baseType(subTarget,['string','number']))?""+subTarget:undefined;
	subTarget = subTarget?subTarget.toLowerCase():undefined;
	if (!(subTarget in lib.dom.append))subTarget = 'append';
	lib.dom.append[subTarget](rec.e, target);
	rec.dom = 1;
	return 1;
    }
    

}




# --- end: src/legacy/bootStrap.js ---



# --- begin: src/legacy/domManager.js ---

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


# --- end: src/legacy/domManager.js ---



# --- begin: src/mount/domAttach.js ---

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


# --- end: src/mount/domAttach.js ---



# --- begin: src/mount/MountManager.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/*

  {
  id: string,             // ✅ Required: local asset ID (must be type:'mount')
  selector?: string,      // Optional: CSS selector to insert relative to (default: document.body)
  container?: string,     // Optional: tag name to wrap content in (e.g., 'div', 'section', 'style')
  method?: string,        // Optional: DOM insertion strategy:
  // "replace" (replaces target element),
  // "before" | "after" (sibling insert),
  // "prepend" | "append" (child insert)
  // Default: "append"

  dissolve?: boolean,     // Optional: if true and container has one child, replace container with it
  attrs?: object          // Optional: HTML attributes to apply to the container
  }
*/
import domAttach from './domAttach.js';
import DomInjector from '../dom/DomInjector.js';
export class MountManager {
    constructor(bootstrap) {
        this.bootstrap = bootstrap;
	this.injector = new DomInjector(bootstrap); 
    }

    alreadyMounted(pkgID,options={}){
	const mounted = this.bootstrap.packages.data.mounted.get(pkgID);
	if ( mounted &&  options?.force !== true){
	    return true;
	}
	return false
    }
    setMounted(pkgID,to=true){
	this.bootstrap.packages.data.mounted.set(pkgID,to);
    }
    
    /**
     * Executes the mount handler with the resolved package.
     * @param {Function|Promise<Function>} mountFn - A function or promise returning one
     * @param {Object} pkg - The loaded package definition
     * @param {Object} args - Optional runtime arguments
     */


    // mount all assets of type: 'mount' (each is a JSON config with {items:[]})
    async load(pkgID=null, options = {}) {
	if (pkgID && !this.bootstrap.packages.isLoaded(pkgID) ){
	    console.warn(`package ${pkgID} not loaded, cannot mount`)
	    return false;
	}

	const plist = pkgID
	      ? [pkgID]
	      : Array.from (this.bootstrap.packages.data.packages.keys() );

	
	if(pkgID && this.alreadyMounted(pkgID,options) ){ //silently complain on bulk load.
	    console.warn(`${pkgID} already mounted, use unload first or options.force=true`);
	    return true;
	}
	   

	for (const key of plist){
	    if (this.alreadyMounted(key,options) )
		continue;
	    this.injectAssets(key,options);
	    this.setMounted(key,true);
	}

	return true;
    }
    
    async unload(pkgID=null, options={}) {
	if(!pkgID) pkgID = null;
	if (pkgID && !this.bootstrap.packages.isLoaded(pkgID) ){
	    console.warn(`package ${pkgID} not loaded, cannot unmount`);
	    return false;
	}

	const plist = pkgID
	      ? [pkgID]
	      : Array.from (this.bootstrap.packages.data.packages.keys() );
	
	for (const key of plist){
	    this.bootstrap.dom.registry.clear(key,true);
	    this.setMounted(key,false);
	}
	return true;
    }
    
    async injectAssets(pkgID,options={}){
	if(!pkgID){
	    console.warn('no pkg id, cannot inject');
	    return;
	}
	    
	let selector = { type: 'mount',packageID: pkgID };
	//console.log('mounting assets with selector ',selector);
	const mountAssets = this.bootstrap.packages.data.getAssets(selector);

	for (const [assetId, entry] of Object.entries(mountAssets)) {
	    //console.warn(assetId,entry);
	    if(this.alreadyMounted(this._pkgID_fromEntry(entry) ,options) )
		return;
	    const cfg = entry?.content?.body ?? null;
	    if (!cfg) continue;
	    
	    const items = Array.isArray(cfg.items) ? cfg.items : [];
	    // Map local ID -> asset entry (so we can reference board/style/sound)

	    //const pkgAssets = packages.getPackageAssets(pkgId);

	    for (const item of items) {
		const node = this.inject(entry,item);
		if(!node) continue;
		this.track(entry,node);
		//this.mounted.push({ node, meta: src.meta, item, from: assetId });
	    }
	}

    }
    _pkgID_fromEntry(entry){
	return  entry?.meta?.packageID;
    }
    inject(entry,item){
	const pkgId = this._pkgID_fromEntry(entry);
	const localId = item?.id;
	if (!localId) return;
	
	// stored IDs in PackageManager are namespaced; look up by originalID
	const src = this.bootstrap.packages.data.getPackageAsset(pkgId, localId);
	if (!src) {
	    console.warn(`[MountManager] Missing asset "${localId}" in package "${pkgId}".`);
	    return;
	}

	const node = this.bootstrap.dom.injector.inject(src, {
	    selector:  item.selector || 'body',
	    container: item.container,      // e.g., 'template', 'style', 'div'
	    method:    item.method || 'append',
	    dissolve:  !!item.dissolve,
	    attrs:     item.attrs || {}
	});
	return node;
    }
    track(entry,node){
	if (!this?.bootstrap?.dom?.registry){
	    console.warn("dom registry not found. skipping");
	    return;
	}
	const pkgId = this._pkgID_fromEntry(entry);
	this.bootstrap.dom.registry.track(node, {group: pkgId} );
	
        // store a little backlink so we can unmount easily
        //finalNode.__mountedBy = { id: trackId, meta: entry?.meta || null };
    }


    
    
}

export default MountManager;



# --- end: src/mount/MountManager.js ---



# --- begin: src/packages/loaders/AssetLoader.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
import AssetLoadReport from '../../report/AssetLoadReport.js';
export class AssetLoader {
    /**
     * Initializes the BootStrap system.
     *
     * @param {BootStrap} bootstrap - A valid BootStrap instance for bootstrapping management, networking and loaders.
     * @param {Object} [options={}] - Optional configuration.
     * @param {Object} [options.repo={}] - Initial repo configuration passed to the Repo manager.
     */
    constructor(bootstrap,controller) {

	if (!bootstrap || typeof bootstrap !== 'object') {
            throw new Error("BootStrap requires a valid bootstrap controller instance");
	}
	this.bootstrap = bootstrap;
	this.controller = controller;
	this.data = controller.data;
	this.net = bootstrap.net;
    }


    hasInPackage(pkgId, id) {
	if (!pkgId || !id) return false;
	const key = this.controller.utils.scopedKey(pkgId, id);
	return this.data.assets.has(key);
    }

    has(key) {
	if (!key) return false;
	return this.data.assets.has(key);
    }

    /**
     * Load a fully-resolved package object (assets first, modules later).
     *
     * @param {object} pkg - Resolved package definition (must include `id` or `lid`).
     * @param {object} [options={}] - Reserved for future overrides.
     * @returns {Promise<boolean>} True if loaded or already loaded; false on failure.
     */
    async load(pkg, options = {}) {
	if (!pkg || typeof pkg !== 'object') {
	    throw new Error("AssetLoader.load() requires a fully resolved package object.");
	}

	const lid = pkg.lid || pkg.id;
	if (!lid) {
	    throw new Error("AssetLoader.load(): package is missing an 'id' (or 'lid').");
	}
	//console.warn(this.bootstrap, this.controller);
	// Idempotent: if already registered, treat as success.
	if (this.controller.isLoaded(lid)) {
	    console.warn(`Package "${lid}" already loaded.`);
	    const report = new AssetLoadReport(lid);
	    report.markSkipped('already-loaded');
	    return report.finalize();
	    //return true;
	}

	// Load assets first; only register on success
	const report = await this._loadAssets(pkg,options);
	if (!report.success) {
	    //console.warn(`AssetLoader.load(): failed to load assets for "${lid}".`);
	    //console.warn(report.toJSON());
	    //return false;
	}
	return report;
	//return true;
    }

    /**
     * Internal: load all assets declared by a package.
     * - Namespaces every asset id with the package id
     * - Stores meta immediately (so inline + remote look the same)
     * - Uses net.batch for remote pulls; marks meta.loaded on success
     *
     * @param {object} pkg
     * @returns {Promise<boolean>}
     */
    async _loadAssets(pkg,options = {}) {
	//console.warn('assets ' ,options);
	const {   limit = options?.limit ?? 8,   awaitAll = true,load:loadHandler,error:errorHandler,itemLoad:perAssetLoadHandler = null,itemError:perAssetErrorHandler = null } = options?.asset || {};
	const assets = Array.isArray(pkg?.assets) ? pkg.assets : null;
	const report = new AssetLoadReport(pkg.id);
	if (!assets){
	    return report.finalize();
	}
	const base = pkg.__meta?.base || '';
	
	const loadList = [];
	for (const asset of assets) {
	    const fullID = this.controller.utils.scopedKey(pkg.id, asset.id);
	    
	    const meta = {
		...asset,                      // merged copy of user-defined metadata
		id: fullID,                    // namespaced full ID (e.g., scene:chess/board)
		originalID: asset.id,          // original short name
		packageID: pkg.id,             // which package it belongs to
		base,                          // used for resolution, logging, etc.
		loaded: false,                 // lifecycle
		source: asset                  // untouched copy of declared asset
	    };
	    //store immediately, so we can take both inline and remote assets.
	    this.data.assetsMeta.set(fullID, meta);
	    
	    if (asset.inline) {
		this.data.assets.set(fullID, asset.content); //store asset separately so we dont have structure hell
		meta.loaded = true;                     // still have reference to stored data.
		report.addInline(fullID);
		continue;
	    }
	    const listEntry = {
		id: fullID,
		originalID: asset.id,
		url: `${base}${asset.url}`,
		type: asset.type || null,
		method: asset.method || 'get',           // Default to GET if unspecified
		opts: asset.fetchOpts || {},             // Optional fetch options (e.g., headers, credentials)
		data: asset.postData || null 
	    };
	    loadList.push(listEntry);
	}
	if (!loadList.length) return report.finalize();

	// Use net.batch
	const oldHandler = this.net.batch.batchHandler;

	const customBatchHandler = this.constructor.makeCustomBatchHandler(this,pkg, {load:perAssetLoadHandler, error: perAssetErrorHandler,report},loadList) ;
	//this.net.batch.setBatchHandler(this.net.batch.batchStatus); // use default behavior (batchStatus);
	//console.warn(customBatchHandler,this.net.batch.batchStatus);
	this.net.batch.setBatchHandler(customBatchHandler);
	//this.net.batch.setBatchHandler(this.constructor.batchStatus); 

	//we dont inject batch handlers here b/c we want finalized results to report back.
	//will require testing with await all. we may want to use this facility if awaitAll = false;

	const {sync,results:batchResults} = await  this.net.batch.run(
	    loadList,
	    (opts) => {
		//console.warn(`loaded asset ${opts.trigger}`,opts);
	    },
	    ({ trigger }) => {
		//console.warn(`Failed to load asset: ${trigger}`);
	    },
	    {awaitAll,limit}
	);

	this.net.batch.setBatchHandler(oldHandler); // restore if needed

	const hasFailures = sync.failed();
	for (const {id} of loadList){
	    this.data.assets.set(id,batchResults[id]); //this.net.batch.context[id]
	    const meta = this.data.assetsMeta.get(id);
            if (meta) {
		meta.loaded = true;
		
            }

	    sync.controller.fail[id]
		? report.addFailed(id)
		: report.addLoaded(id);
	    
	}

	report.finalize();
	const [runner,rtype] = report.success?[loadHandler,'LOAD']:[errorHandler,'ERROR'];
	await this.bootstrap._runHandlers(runner, {pkg, sync,batchResults,report}, `[ASSET-${rtype} - ${pkg.id}]`,pkg.id);
	return report;
    }




    /**
     * Unload a package and optionally prune its assets/modules.
     * NOTE: Does NOT touch the DOM; that’s MountManager’s job.
     *
     * @param {string} pkgId
     * @param {Object} [opts]
     * @param {boolean} [opts.keepAssets=false]   - Keep assets & metadata
     * @param {boolean} [opts.keepModules=false]  - Keep modules & metadata
     * @returns {{ok:boolean, removedAssets:string[], removedModules:string[]}}
     */
    unload(pkgId, options = {}) {
	if (!pkgId || !this.controller.isLoaded(pkgId)) return false;
	const pkg = this.data.packages.get(pkgId);
	if (!pkg)  return false;
	
	// assetsMeta keys → figure which belong to this package
	for (const [id, meta] of this.data.assetsMeta.entries()) {
	    if (meta?.packageID === pkgId) {
		this.data.assetsMeta.delete(id);
		this.data.assets.delete(id);
	    }
	}
	
	return true;
    }

    
    /**
     * Check whether a data object matches a filter.
     * The filter can be a predicate function or a partial object.
     *
     * @param {object} data - The object to test.
     * @param {function|object|null} filter - A function or partial object to match against.
     * @returns {boolean}
     */
    static filterMatch(data, filter) {
	if (!filter) return true;

	if (typeof filter === 'function') {
            return filter(data);
	}

	if (typeof filter === 'object') {
            for (const key in filter) {
		if (data[key] !== filter[key]) return false;
            }
            return true;
	}

	// Unsupported filter type
	return false;
    }
    
    /**
     * Internal utility: Construct a unified asset entry object.
     * @param {string} id - Asset ID
     * @returns {{content: *, meta: object}|undefined}
     */
    _assetEntry(id) {
	const meta = this.data.assetsMeta.get(id);
	if (!meta) return undefined;

	return {
            content: this.data.assets.get(id), // May be undefined if not loaded
            meta
	};
    }

    /**
     * Retrieve a specific asset entry by ID.
     * @param {string} id - Asset ID
     * @returns {{content: *, meta: object}|undefined}
     */
    getAsset(id) {
	return this._assetEntry(id);
    }

    /**
     * Get all loaded assets as a hash of entries { id: {content, meta} }.
     * Optionally filter by a predicate function.
     *
     * @param {function(meta: object, id: string): boolean} [filter=null] - Optional filter function to select specific assets.
     * @returns {Object<string, {content: *, meta: object}>}
     */
    getAssets(filter = null) {
	const result = {};
	for (const [id, meta] of this.data.assetsMeta.entries()) {
            if (!filter || this.constructor.filterMatch(meta, filter)) {
		result[id] = this._assetEntry(id);
            }
	}
	return result;
    }


    /**
     * Get a specific asset from a specific package by original asset ID.
     * @param {string} pkgId - Package ID
     * @param {string} originalID - Original (un-prefixed) asset ID
     * @returns {{content: *, meta: object}|undefined}
     */
    getPackageAsset(pkgId, originalID) {
	for (const [id, meta] of this.data.assetsMeta.entries()) {
            if (meta.packageID === pkgId && meta.originalID === originalID) {
		return this._assetEntry(id);
            }
	}
	return undefined;
    }

    /**
     * Get all assets loaded by a specific package, optionally filtered.
     * @param {string} pkgId - Package ID
     * @param {object|function|null} [filter=null] - Optional filter (predicate or hash of key/value pairs)
     * @returns {Object<string, {content: *, meta: object}>}
     */
    getPackageAssets(pkgId, filter = null) {
	const result = {};
	for (const [id, meta] of this.data.assetsMeta.entries()) {
            if (meta.packageID !== pkgId) continue;
            if (!filter || this.constructor.filterMatch(meta, filter)) {
		result[id] = this._assetEntry(id);
            }
	}
	return result;
    }   

    
    static     batchStatus(obj,id,handler)  {
        return (res) => {
            obj.context[id] = res;
            if (!res.ok) {
                return false;
            }
            if(handler)
                return handler(res);
            return res;
        }
    }


    static makeCustomBatchHandler (assetLoader, pkg, {load, error,report} , loadList){
	const assetMap = new Map(loadList.map(item => [item.id, item]));
	const defaultAsset = pkg?.assetDefault ?? {};
	//console.warn('pkg is ',pkg,load,error);
	return (obj,id,handler) => {
	    const currentAsset = assetMap.get(id);
	    
	    return (res) => {
		obj.context[id] = res;
		const [runner,rv,rtype] = res.ok
		      ? [ load,res,'LOAD' ]
		      : [ error, false,'ERROR'];

		//cant use async here. the batch loader doesnt seem to handle it.
		assetLoader.bootstrap._runHandlers(runner, {pkg, asset:currentAsset,id,batch:obj,report}, `[ASSET-ITEM-${rtype} - ${pkg.id} - ${id}]`,pkg.id);
		return rv;
	    };
	}
    }

}
export default AssetLoader;


/*
async load(pkg, options = {}) {
  if (!pkg || typeof pkg !== 'object') {
    throw new Error("AssetLoader.load() requires a fully resolved package object.");
  }

  const lid = pkg.lid || pkg.id;
  if (!lid) {
    throw new Error("AssetLoader.load(): package is missing an 'id' (or 'lid').");
  }

  // If already loaded, return a trivial report to keep the shape consistent
  if (this.controller.isLoaded(lid)) {
    const report = new AssetLoadReport(lid);
    report.markSkipped('already-loaded');
    return report.finalize();
  }

  // Load assets and return the detailed report upward
  const report = await this._loadAssets(pkg, options);

  if (!report.success) {
    console.warn(`AssetLoader.load(): failed to load assets for "${lid}".`);
  }

  return report;
}
 */


# --- end: src/packages/loaders/AssetLoader.js ---



# --- begin: src/packages/loaders/ModuleLoader.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
import ModuleLoadReport   from '../../report/ModuleLoadReport.js';
import concurrencyLimiter from '../../utils/concurrencyLimiter.js';
export class ModuleLoader {
    /**
     * Initializes the BootStrap system.
     *
     * @param {BootStrap} bootstrap - A valid BootStrap instance for bootstrapping management, networking and loaders.
     * @param {Object} [options={}] - Optional configuration.
     * @param {Object} [options.repo={}] - Initial repo configuration passed to the Repo manager.
     */
    constructor(bootstrap,controller) {

	if (!bootstrap || typeof bootstrap !== 'object') {
            throw new Error("BootStrap requires a valid bootstrap controller instance");
	}
	this.bootstrap = bootstrap;
	this.controller = controller;
	this.data = controller.data;
	this.net = bootstrap.net;

    }
    get(id){
	return this.data.modules.get(id);
    }
    
    /**
     * Loads a package by ID or JSON path.
     * @param {string|object} def - Package ID or direct definition
     * @returns {Promise<void>}
     */

    async load(pkg,options={}) {
	if (!pkg || typeof pkg !== 'object') {
            throw new Error("loadPackage() requires a fully resolved package object.");
	}

	const lid = pkg.lid || pkg.id;
	
	if (this.controller.isLoaded(lid)) {
            console.warn(`Package "${lid}" already loaded.`);
            return;
	}

	const modSuccess   = await this._loadModules(pkg,options);
	return modSuccess;

    }



    async _loadModules(pkg,options = {}) {
	const {   limit = options?.limit ?? 8,   awaitAll = true,load:loadHandler,error:errorHandler,itemLoad:itemLoadHandler = null,itemError:itemErrorHandler = null } = options?.module || {};
	const base = pkg.__meta?.base || '';
	const mods = Array.isArray(pkg.modules) ? pkg.modules : [];
	const report = new ModuleLoadReport(pkg.id);
	if (!mods.length) return report.finalize();

	// Prime metadata + create load promises

	const createTask =  (entry) => {
            const fullID  = this.controller.utils.scopedKey(pkg.id, entry.id);
            const fullURL = base + entry.url;

            const meta = {
		...entry,                 // user-defined fields (type, etc.)
		id: fullID,               // namespaced ID (e.g., scene:chess/logic)
		originalID: entry.id,     // short name from the package
		packageID: pkg.id,        // owning package
		base,
		loaded: false,
		source: entry
            };
            this.data.modulesMeta.set(fullID, meta);
            // Start the import, but don't await yet

	    return async () => {
		try {
		    const mod = await this.net.modules.load(fullID, fullURL);
		    meta.loaded = true; // optional: mark loaded
		    return { status: 'fulfilled', id: fullID, mod };
		} catch (err) {
		    return { status: 'rejected', id: fullID, err };
		}
	    };
	};
	const limiter = concurrencyLimiter(limit);
	const tasks = mods.map(createTask); // each task = { id, promise }
	const limited = tasks.map(run => limiter(run));
	const results = await Promise.all(limited);

	// Commit results to maps, annotate meta

	for (const r of results) {
            const meta = this.data.modulesMeta.get(r.id);
	    let runner = null;
	    let rtype = null;
            if (r.status === 'fulfilled') {
		this.data.modules.set(r.id, r.mod);
		if (meta) meta.loaded = true;
		report.addLoaded(r.id,{meta});
		runner = itemLoadHandler;
		rtype = 'LOAD';
            } else {
		if (meta) {
                    meta.loaded = false;
                    meta.error  = r.err;
 		}
		report.addFailed(r.id,r.err);
		runner = itemErrorHandler;
		rtype = 'ERROR';
		console.warn(`Failed to import module: ${r.id}`, r.err);
            }
	    await this.bootstrap._runHandlers(runner, {pkg,report,module:r }, `[MODULE-ITEM-${rtype} - ${pkg.id} - ${r.id}]`,pkg.id);
	}

	report.finalize();
	const [runner,rtype] = report.success?[loadHandler,'LOAD']:[errorHandler,'ERROR'];
        await this.bootstrap._runHandlers(runner, {pkg, report }, `[MODULE-ITEM-${rtype} - ${pkg.id}]`,pkg.id);
	
	return report;
    }

    
    /**
     * Unload a package and optionally prune its assets/modules.
     * NOTE: Does NOT touch the DOM; that’s MountManager’s job.
     *
     * @param {string} pkgId
     * @param {Object} [opts]
     * @param {boolean} [opts.keepAssets=false]   - Keep assets & metadata
     * @param {boolean} [opts.keepModules=false]  - Keep modules & metadata
     * @returns {{ok:boolean, removedAssets:string[], removedModules:string[]}}
     */
    unload(pkgId, options = {}) {
	if (!pkgId || !this.controller.isLoaded(pkgId)) return false;
	const pkg = this.data.packages.get(pkgId);
	if (!pkg)  return false;
	
	for (const [id, meta] of this.data.modulesMeta.entries()) {
	    if (meta?.packageID === pkgId){
		this.data.modulesMeta.delete(id);
		this.data.modules.delete(id);
	    }
	}

	return true;
    }

}
export default ModuleLoader;


# --- end: src/packages/loaders/ModuleLoader.js ---



# --- begin: src/packages/PackageData.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/**
 * Central in-memory registry for loaded packages, assets, and modules.
 * - Source of truth for content + metadata (Maps keyed by internal IDs)
 * - Queried by filters (predicate or partial-object matches)
 * - Mutated by the Bootstrap loader as packages resolve/mount
 *
 * Responsibilities:
 *   - Track per-package state (meta.loaded, etc.)
 *   - Expose unified entry shapes: { content, meta } for assets/modules
 *   - Provide lookups by package ID and original (un-prefixed) IDs
 * “All getters return undefined when not found; null is not used.
 */

/**
 * @typedef {object} EntryMeta
 * @property {string} packageID
 * @property {string} originalID
 * @property {boolean} [loaded]
 *
 * @typedef {{content:any|undefined, meta:EntryMeta}} AssetEntry
 * @typedef {{content:any|undefined, meta:EntryMeta}} ModuleEntry
 * @typedef {{assets:Record<string,AssetEntry>, modules:Record<string,ModuleEntry>, meta:object}} PackageEntry
 */


export class PackageData {
    /**
 * @param {object} bootstrap - Loader/Bootstrap instance with mount/unmount hooks
 * @param {object} controller - Orchestrator/controller providing lifecycle integration
 */

    constructor(bootstrap,controller){
	this.bootstrap = bootstrap;
	this.controller = controller;
	this.mounted     = new Map();
	this.packages    = new Map();   // Cache of loaded packages by local ID
        this.assets      = new Map();     // Registry of loaded assets (DOM, CSS, etc.)
        this.assetsMeta  = new Map();     // Registry of loaded meta data assets (DOM, CSS, etc.) (extract from both pkg and return data)
        this.modules     = new Map();    // Loaded JS module references
        this.modulesMeta = new Map();    // Loaded JS module meta info
    }

    /**
 * Check whether a package is considered loaded.
 * Currently defined as "present in this.packages".
 * If you need strict checks, prefer __meta.loaded.
 *
 * @param {string} id
 * @returns {boolean}
 *
 * @example
 * // lightweight presence check
 * data.package_isLoaded("ui-kit")
 */

    package_isLoaded(id) {
        if (!id || typeof id !== 'string') return false;
	return this.packages.has(id);
	//this is a work in progress something is breaking along the way.
	//working on this, dont delete
	//if (! this.packages.has(id) ) return false;
        //return !!this.packages.get(id)?.__meta?.loaded;
    }
    /**
 * Mark a package's meta as loaded.
 * @throws {Error} if the package doesn't exist or has no __meta object
 */

    package_setLoaded(id){
	if (!this.packages.has(id) )
	    throw new Error(`package ${id} not loaded, cannot set!`);
	const pkg = this.packages.get(id);

	if (!pkg.__meta)
	    throw new Error (`package ${id} improperly setup, cannot set meta data`);
	pkg.__meta.loaded = true;
    }


    /**
     * Check whether a data object matches a filter.
     * The filter can be a predicate function or a partial object.
     * Uses shallow strict-equality on Object.keys(filter); ignores prototype chain.
     *
     * @param {object} data
     * @param {function(object):boolean | object | null} filter
     *  - function: predicate(data) -> boolean
     *  - object: shallow partial match via strict equality on own keys
     *  - null/undefined: match all
     */
    static filterMatch(data, filter) {
	if (!filter) return true;

	if (typeof filter === 'function') {
            return filter(data);
	}

	if (typeof filter === 'object') {
            for (const key in filter) {
		if (data[key] !== filter[key]) return false;
            }
            return true;
	}

	// Unsupported filter type
	return false;
    }
    
    /**
     * Internal utility: Construct a unified asset entry object.
     * @private
     * @param {string} id - Asset ID
     * @returns {AssetEntry|undefined}
     * Returns undefined if no meta exists for the id.
     */

    _assetEntry(id) {
	const meta = this.assetsMeta.get(id);
	if (!meta) return undefined;

	return {
            content: this.assets.get(id), // May be undefined if not loaded
            meta
	};
    }

    /**
     * See _assetEntry
     */
    getAsset(id) {
	return this._assetEntry(id);
    }


    /**
     * Get all loaded assets as { id: {content, meta} }.
     * Optionally filter by a predicate or a shallow partial-object match.
     *
     * @param {((meta: object, id: string)=>boolean)|object|null} filter
     * @returns {Record<string, AssetEntry>}
     */
    
    getAssets(filter = null) {
	const result = {};
	for (const [id, meta] of this.assetsMeta.entries()) {
            if (!filter || this.constructor.filterMatch(meta, filter)) {
		result[id] = this._assetEntry(id);
            }
	}
	return result;
    }


    /**
     * Lookup by the asset's original (un-prefixed) ID within a package.
     * @param {string} pkgId
     * @param {string} originalId
     * @returns {AssetEntry|undefined}
     */

    getPackageAsset(pkgId, originalId) {
	for (const [id, meta] of this.assetsMeta.entries()) {
            if (meta.packageID === pkgId && meta.originalID === originalId) {
		return this._assetEntry(id);
            }
	}
	return undefined;
    }

    /**
     * Get all assets loaded by a specific package, optionally filtered.
     * Optionally filter by a predicate function. or partial object match
     *
     * @param {string} pkgId - Package ID
     * @param {((meta: object, id: string)=>boolean)|object|null} filter
     * @returns {Record<string, AssetEntry>}
     */
    getPackageAssets(pkgId, filter = null) {
	const result = {};
	for (const [id, meta] of this.assetsMeta.entries()) {
            if (meta.packageID !== pkgId) continue;
            if (!filter || this.constructor.filterMatch(meta, filter)) {
		result[id] = this._assetEntry(id);
            }
	}
	return result;
    }   


    /**
     * Internal utility: Construct a unified module entry object.
     * @private
     * @param {string} id - Module ID
     */
    _moduleEntry(id) {
	const meta = this.modulesMeta.get(id);
	if (!meta) return undefined;

	return {
            content: this.modules.get(id), // May be undefined if not loaded
            meta
	};
    }

    /**
     * Get a specific module from a specific package by original asset ID.
     * @param {string} pkgId - Package ID
     * @param {string} originalId - Original (un-prefixed) asset ID
     * @returns {ModuleEntry|undefined}
     */
    
    getPackageModule(pkgId,originalId){
	 for (const [id, meta] of this.modulesMeta.entries()) {
            if (meta.packageID === pkgId && meta.originalID === originalId) {
                return this._moduleEntry(id);
            }
        }
        return undefined;
    }

    /**
     * Get all Modules loaded by a specific package, optionally filtered.
     * @param {string} pkgId - Package ID
     * @param {object|function|null} [filter=null] - Optional filter (predicate or hash of key/value pairs)
     * @returns {Object<string, {content: *, meta: object}>}
     */
    getPackageModules(pkgId, filter = null) {
	const result = {};
	for (const [id, meta] of this.modulesMeta.entries()) {
            if (meta.packageID !== pkgId) continue;
            if (!filter || this.constructor.filterMatch(meta, filter)) {
		result[id] = this._moduleEntry(id);
            }
	}
	return result;
    }   

    /**
     * Retrieve a specific module entry by ID.
     * @param {string} id - module ID
     * @returns {ModuleEntry|undefined}
     */
    getModule(id) {
	return this._moduleEntry(id);
    }

    /**
     * Get all loaded modules as { id: {content, meta} }.
     * Optionally filter by a predicate or a shallow partial-object match.
     *
     * @param {((meta: object, id: string)=>boolean)|object|null} filter
     * @returns {Record<string, ModuleEntry>}
     */
    getModules(filter = null) {
	const result = {};
	for (const [id, meta] of this.modulesMeta.entries()) {
            if (!filter || this.constructor.filterMatch(meta, filter)) {
		result[id] = this._moduleEntry(id);
            }
	}
	return result;
    }

    /**
     * @param {((meta:object, id:string)=>boolean)|object|null} filter
     * @returns {string[]} Array of package IDs
     */

    listPackages(filter = null){

	const result = [];
	for (const [id, meta] of this.packages.entries()) {
            if (!filter || this.constructor.filterMatch(meta, filter)) {
		result.push(id);
            }
	}

	return result;
    }

    /**
     * Returns packages , with meta data, and by id. optionally filterable with predicate or shallow match object
     * @param {((meta:object, id:string)=>boolean)|object|null} filter
     * @returns {Record<string, PackageEntry>}
     */
    getPackages(filter = null){

	const result = {};
	for (const [id, meta] of this.packages.entries()) {
            if (!filter || this.constructor.filterMatch(meta, filter)) {
		result[id] = this._packageEntry(id);
            }
	}

	return result;
    }
    
    /**
     * Retrieve a specific package entry by ID.
     * @param {string} id - package ID
     * @returns {PackageEntry|undefined}
     */
    getPackage(id) {
        return this._packageEntry(id);
    }
    
    /**
     * Internal utility: Construct a unified package entry object.
     * @private
     * @param {string} id - Package ID
     * @returns {PackageEntry|undefined}
     */
    _packageEntry(id) {
	const meta = this.packages.get(id);
	if (!meta) return undefined;
	const assets = this.getPackageAssets(id);
	const modules = this.getPackageModules(id);
	return {
	    assets,
	    modules,
            meta 
	};
    }

    
    
}

export default PackageData;


# --- end: src/packages/PackageData.js ---



# --- begin: src/packages/PackageManager.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
import utils             from './utils/index.js';
import PackageData       from './PackageData.js';
import AssetLoader       from './loaders/AssetLoader.js';
import ModuleLoader      from './loaders/ModuleLoader.js';
import PackageLoadReport from '../report/PackageLoadReport.js';
export class PackageManager {
    /**
     * Initializes the BootStrap system.
     *
     * @param {BootStrap} bootstrap - A valid BootStrap instance for bootstrapping management, networking and loaders.
     * @param {Object} [options={}] - Optional configuration.
     * @param {Object} [options.repo={}] - Initial repo configuration passed to the Repo manager.
     */
    constructor(bootstrap) {

	if (!bootstrap || typeof bootstrap !== 'object') {
            throw new Error("BootStrap requires a valid bootstrap controller instance");
	}
	this.bootstrap = bootstrap;
	this.net = bootstrap.net;

	this.data        = new PackageData(bootstrap,this);
	this.assets      = new AssetLoader(bootstrap,this);
	this.modules     = new ModuleLoader(bootstrap,this);
	this.utils       = utils;
	this.repo = this.bootstrap.repo;
    }

    get(id){
	return this.data.packages.get(id);
    }

    /**
     * Checks whether a package with the given ID is already loaded.
     *
     * @param {string} id - The local ID of the package to check.
     * @returns {boolean} - True if the package is already loaded, false otherwise.
     */
    isLoaded(id) {
	return this.data.package_isLoaded(id);
    }
    
    /**
     * Loads a package by ID or JSON path.
     * @param {string|object} def - Package ID or direct definition
     * @returns {Promise<void>}
     */

    async load(pkg,options={}) {
	const hooks = options?.package?.hooks ?? options?.hooks ?? false;
	const loadHandler = options?.package?.load;
	const errorHandler = options?.package?.error;

	const report = new PackageLoadReport().start({ pkg, options, hooks });
	
	if (!pkg || typeof pkg !== 'object') {
            throw new Error("loadPackage() requires a fully resolved package object.");
	}


	const lid = pkg.lid || pkg.id;
	
	if (this.data.package_isLoaded(lid) ){
            console.warn(`Package "${lid}" already loaded.`);
            return;
	}

	const assetReport = await this.assets.load(pkg,options);
	
	const moduleReport   = await this.modules.load(pkg,options);
	report.noteModules(moduleReport).noteAssets(assetReport);
	
	// Cache the definition
	this.data.packages.set(lid, pkg);


	if(moduleReport.success && hooks){
	    const hookSuccess = await this._runHooks(pkg,'run',{pkg,report});
	    report.noteHooksResult(hookSuccess);
	}

	const [runner,rtype] = moduleReport.success && assetReport.success
	      ? [loadHandler,'LOAD']
	      : [errorHandler,'ERROR'];
	report.noteRunner(runner);
        const handlerResult = await this.bootstrap._runHandlers(runner, {pkg,report}, `[PACKAGE-${rtype} - ${pkg.id}]`,pkg.id);
	report.noteHandlersResult(handlerResult);
	//this.data.package_setLoaded(lid);

	return report.finalize();
    }



    /**
     * Unload a package and optionally prune its assets/modules.
     * NOTE: Does NOT touch the DOM; that’s MountManager’s job.
     *
     * @param {string} pkgId
     * @param {Object} [opts]
     * @param {boolean} [opts.keepAssets=false]   - Keep assets & metadata
     * @param {boolean} [opts.keepModules=false]  - Keep modules & metadata
     * @returns {{ok:boolean, removedAssets:string[], removedModules:string[]}}
     */
    unload(pkgId, { keepAssets = false, keepModules = false } = {}) {
	if (!pkgId || !this.isLoaded(pkgId)) return false;
	const pkg = this.data.packages.get(pkgId);
	if (!pkg)  return false;
	
	// 1) remove assets for this package (unless kept)
	if (!keepAssets) {
	    this.assets.unload(pkgId);
	}

	// 2) remove modules for this package (unless kept)
	if (!keepModules) {
	    this.modules.unload(pkgId);
	}
	
	// 3) finally drop the package record itself
	this.data.packages.delete(pkgId);
	
	return true;
    }


    
    _getSymbolicFunction(entry, bind = false) {
	if (typeof entry !== 'string' || entry ==='') return undefined;

	const [modID, fnPath] = entry.split('.', 2);
	const mod = this.modules.get(modID);
	if (!mod) return undefined;
	if (!fnPath) {
            // Module itself is callable (e.g., @foo where modules.get("foo") is a function)
            return typeof mod === 'function' ? (bind ? mod.bind(mod) : mod) : undefined;
	}

	const fn = this.bootstrap.constructor.LIBFUNCGET(fnPath, false, mod, bind);
	return typeof fn === 'function' ? fn : undefined;
    }

    async _runHooks(pkg,type='run',ctx) {
        const runner = pkg?.[type] ?? null;
        if (!runner || !Array.isArray(runner) ) return true;
        return await this.bootstrap._runHandlers(runner, ctx, `[PACKAGE-HOOK] [${type}] ${pkg.id}`,pkg.id);
    }
    
    



}
export default PackageManager;


# --- end: src/packages/PackageManager.js ---



# --- begin: src/packages/utils/index.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/**
 * Generate a standardized scoped key for a package asset/module.
 *
 * @param {string} pkgId - The package ID (e.g., "scene:chess")
 * @param {string} id - The local asset/module ID within the package (e.g., "board")
 * @returns {string} Scoped key in the format "<pkgId>/<id>"
 */
function scopedKey(pkgId, id) {
    if (typeof pkgId !== 'string' || !pkgId.trim()) {
        throw new Error("scopedKey: pkgId must be a non-empty string");
    }
    if (typeof id !== 'string' || !id.trim()) {
        throw new Error("scopedKey: id must be a non-empty string");
    }
    return `${pkgId}/${id}`;
}


export default {
    scopedKey
};


# --- end: src/packages/utils/index.js ---



# --- begin: src/repo/Repo.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
import concurrencyLimiter from '../utils/concurrencyLimiter.js';
import RepoResolveReport  from '../report/repoResolveReport.js';
/**
 * 📦 Repo
 *
 * Manages access to remote or local repository endpoints for resolving
 * package definitions (e.g., scenes, engines, UI bundles).
 *
 * This class is designed to provide flexible package discovery and fetching
 * across prioritized endpoint lists. It abstracts away the process of
 * determining the full URL to fetch a package definition from its ID.
 *
 * Typical usage involves:
 * - Setting up a prioritized list of repo base URLs
 * - Resolving symbolic IDs like "scene:chess" to real JSON paths
 * - Downloading package definitions for use in BootStrap
 *
 * This class does not manage asset downloading or execution — only package resolution.
 */
export class Repo {

    /**
     * @param {Net} net - Required Net instance for performing fetches.
     * @param {Object} [opts={}] - Optional configuration object.
     * @param {Array<string>} [opts.repos=[]] - Default list of base repo endpoints.
     */
    constructor(bootstrap, opts = {}) {
        if (!bootstrap) {
            throw new Error("Repo requires a valid bootstrapinstance.");
        }
	this.bootstrap = bootstrap;
        this.net = bootstrap.net;
        this.opts = opts;
        this.repos = Array.isArray(opts.repos) ? opts.repos : [''];
	this._resolveCache = new Map(); // new cache
    }



    /**
     * Normalize a packageResource into { label, stem, repos } without joining.
     *
     * Input forms:
     * - "scene:chess"
     * - { resource: "scene:chess", repo: ["/repo", { url: "/alt", method: "POST", postData: {...}, fetchOpts: {...} }] }
     * - { resource: {...inlinePackageObject...} }  // inline package
     *
     * Output:
     * {
     *   label: string,                 // stable identifier for this resource
     *   stem: string|null,             // resource string if present (lowercased), else null for inline
     *   repos: Array<{                 // normalized repo entries (deduped by url)
     *     url: string,
     *     method: 'get'|'post',
     *     postData?: any,
     *     fetchOpts: object
     *   }>
     * }
     */
    normalizePackageResource(resource) {
	const lower = s => (typeof s === 'string' ? s.trim().toLowerCase() : s);

	const normalizeRepo = (r, defaults = {}) => {
	    if (!r) return null;
	    if (typeof r === 'string') {
		return { url: r, method: 'get', fetchOpts: {}, ...defaults };
	    }
	    if (typeof r === 'object') {
		const url = r.url ?? '';
		const method = String(r.method || defaults.method || 'get').toLowerCase();
		const postData = r.postData ?? defaults.postData ?? null;
		const fetchOpts = { ...(defaults.fetchOpts || {}), ...(r.fetchOpts || {}) };
		return { url, method: method === 'post' ? 'post' : 'get', postData, fetchOpts };
	    }
	    return null;
	};

	const dedupeByUrl = list => {
	    const seen = new Set();
	    const out = [];
	    for (const it of list) {
		const key = lower(it.url || '');
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push({ ...it, url: key }); // store url lowercased
	    }
	    return out;
	};

	// Case 1: string resource → no repos attached here
	if (typeof resource === 'string') {
	    const stem = lower(resource);
	    return { label: stem, type:'remote', stem, repos: [] };
	}

	// Case 2: object resource
	if (resource && typeof resource === 'object') {
	    const res = resource.resource;

	    // Inline package: resource is an object
	    if (res && typeof res === 'object') {
		const label = res.id ? lower(res.id) : '[inline]';
		return { label, type:'inline', stem: null, repos: [] };
	    }

	    // External package: resource is a string + optional repo(s)
	    if (typeof res === 'string') {
		const stem = lower(res);
		const repoField = resource.repo;

		// Normalize repo list (string | object | array of those)
		const rawList = Array.isArray(repoField) ? repoField : (repoField ? [repoField] : []);
		const repos = dedupeByUrl(
		    rawList
			.map(r => normalizeRepo(r))
			.filter(Boolean)
		);

		// default label = stem; if you prefer including first repo host, adjust here
		return { label: stem, type:'remote', stem, repos };
	    }
	}

	// Fallback: unknown shape
	return { label: '[unknown]', stem: null, repos: [] };
    }

    /**
     * Recursively traverses and resolves all packages and their dependencies
     * into a unique set of package definitions.
     *
     * This function walks the dependency graph starting from the given package(s),
     * fetching package definitions via `repo.resolve()` and normalizing each
     * reference with `repo.normalizePackageResource()` to avoid duplicate work.
     *
     * It does NOT:
     *   - Install or load the packages
     *   - Sort the packages in dependency order (topological sort)
     *   - Produce an explicit adjacency map of the graph
     *
     * Instead, it returns a flat array of unique package definitions discovered
     * during traversal (deps-first order for the traversal path taken).
     *
     * @async
     * @param {string|object|Array<string|object>} input
     *     One or more packageResource references. Each may be:
     *       - A direct URL or symbolic ID (string)
     *       - A packageResourceObject { resource, [repo] }
     *       - An inline package definition { resource: { ...packageDef } }
     *
     * @param {object} [options={}]
     *     Reserved for future traversal/graph options (e.g., max depth, filtering).
     *
     * @returns {Promise<Array<object>>}
     *     A Promise resolving to an array of unique resolved package definitions.
     *
     * @example
     * // Collect all unique dependencies for a scene
     * const packages = await buildDependencyGraph("scene:chess");
     * console.log(packages.map(p => p.id));
     */
    async buildDependencyGraph(input, options = {}) {
	const { limit = options?.limit ?? 8, circuitBreaker = 100,load:loadHandler = null, error: errorHandler=null, itemLoad : itemLoadHandler=null, itemError:itemErrorHandler = null } = options?.repo || {};

	const report = new RepoResolveReport();
	report.startRun();                // mark start, capture options if you want
	report.noteInput(input);   

	
        const normalize = v => (Array.isArray(v) ? v : v == null ? [] : [v]);
        const  alreadyVisited = (list, resource) =>{
            const norm = this.normalizePackageResource(resource);
            return list.some(entry => {
                if (entry.type !== norm.type) return false;
                if (entry.stem !== norm.stem) return false;
                if (entry.repos.length !== norm.repos.length) return false;
                const result =  entry.repos.every((r, i) =>
                    r.url === norm.repos[i].url &&
                        r.method === norm.repos[i].method
                );
		if (result)
		    report.noteSkip({ resource, reason: 'cache_hit', key: `${norm.stem} - ${norm.type}` });
		return result;
            });
        };
        let counter = 0;
        const out = [];
        const visited = [];
	const errors = [];
	let tripped = false;

        const visit = async (node) => {
	    if( tripped ) {
		return true;
	    }

            if (counter++ > circuitBreaker) {
		tripped = true;
		const msg = `circuitBreaker tripped at ${circuitBreaker} iterations for graph production. set it higher or investigate further`;
		errors.push(msg,node);
		return;
	    }

            if (!node) return;
            if (alreadyVisited(visited, node) ) {
		report.noteSkip({ node, reason: 'already_visited' });
                return;
            }
	    report.noteVisitStart(node);
	    
            const normalized =this.normalizePackageResource(node);
	    report.noteNormalizedResource(normalized);
            visited.push(normalized);

            const def = await this.resolve(node).catch(() => null);
            if (!def) {
		await this.bootstrap._runHandlers(itemErrorHandler, {node,def,report},`[REPO-ITEM-ERROR]`);
		report.noteResolveFail({ node, reason: 'null_definition' });
		errors.push([`unable to resolve ${normalized.label}`,node]);
		return;
	    }
	    report.noteResolveSuccess(def);   // include def.id, source URL, repo used, etc.

	    await this.bootstrap._runHandlers(itemLoadHandler, {node,def,report },`[REPO-ITEM-LOAD]`);
	    
            // Run all child visits in parallel…
            const deps = normalize(def.dependencies);
	    report.noteDependencies(def.id, deps);

            const limiter = concurrencyLimiter(limit); // e.g., 8 concurrent
            await Promise.all(deps.map(d => limiter(() => visit(d))));
            out.push(def);
	    report.noteOrdered(def.id, out.length);  // “position N in build order”
        };

        for (const item of normalize(input)) {
	    report.noteEnqueue(item); 
            await visit(item);
        }
	//console.log('here');
	//console.log(errors);
	if (errors.length){
            await this.bootstrap._runHandlers(errorHandler, {input,output:out,report },`[REPO-ERROR]` );
	    //throw new Error(`dependency graph encountered ${errors.length} errors, first: ${errors[0][0]}`); 
	}else {
	    await this.bootstrap._runHandlers(loadHandler, {input,output:out,report } ,`[REPO-LOAD]` );
	}
	report.finishRun({ total: out.length });
	report.finalize();
	return { list: out, report };
        //return out; // always an array
    }

    
    
    async resolve(input, opts = {}) {
	const key = this._makeCacheKey(input);
	if (key && this._resolveCache.has(key)) {
            return this._resolveCache.get(key);
	}

	let result;

	if (typeof input === 'string') {
            result = await this.load(input, opts);
	} else if (input && typeof input === 'object') {
            const { resource, repo, ...rest } = input;
            result = await this.load(resource, { repo, ...opts, ...rest });
	} else {
            console.warn("[Repo] Invalid input to resolve:", input);
            return null;
	}

	if (key && result) {
            this._resolveCache.set(key, result);
	}

	return result;
    }

    _makeCacheKey(input) {
	if (typeof input === 'string') return input;
	if (input && typeof input === 'object' && typeof input.resource === 'string') {
            return input.resource;
	}
	return null; // fallback if it's inline or anonymous
    }

    /**
     * Resolves a package definition from an ID, path, or inline object.
     *
     * This is a lightweight utility that returns the resolved package definition
     * without loading any assets, dependencies, or executing lifecycle hooks.
     *
     * Supported inputs:
     * - A direct package object → returned as-is (with optional handler transformation)
     * - A path ending in `.json` → fetched using the provided or fallback repo list
     * - A symbolic ID (e.g., "scene:chess") → resolved against known endpoints
     *
     * @param {string|object} def - The package ID, URL, or direct definition object.
     * @param {object} [options={}] - Optional resolution configuration.
     * @param {Array<string>|null} [options.repo=null] - Custom repo list to search first. Null = fallback.
     * @param {Array<string>} [options.repo_order=["runtime", "default"]] - Search priority strategy.
     * @param {string|false} [options.lid=false] - Override local ID for registration. False = infer automatically.
     * @param {function|null} [options.handler=null] - Optional synchronous function to transform the resolved package.
     * @returns {Promise<object>} The resolved (and possibly transformed) package definition.
     */
    async load(def, {
	repo = null,
	repo_order = ["runtime", "default"],
	lid = false,
	handler = null,
	method ='get',
	postData = null,
	fetchOpts = null
    } = {}) {
	// 1. Direct object — no resolution needed
	if (typeof def === 'object' && def !== null) {
	    return this._resolve(def, lid,null, handler);
	}

	// 2. Ensure def is a string (symbolic ID or URL)
	if (typeof def !== 'string') {
	    throw new Error("Invalid package definition: must be object or string");
	}

	// 3. Determine if it's a direct .json path (e.g. /pkg/xyz.json)
	const isPath = def.endsWith('.json');
	const errors = [];
	// 4. Build repo search list

	const repoList = this._buildRepoList(repo, repo_order,{method,postData, fetchOpts});

	// 5. Try each repo to resolve the package
	for (const { url: baseUrl, label, method, postData, fetchOpts } of repoList) {
	    const url = this._buildPath(baseUrl, def, isPath);
	    try {
		
		//const pkg = await this.net.http.get(url, { format: 'body' });
		let resp = null;
		if (method ==='post') {
		    resp = await this.net.http.post(url, postData, fetchOpts);
		}else {
		    resp = await this.net.http.get(url, fetchOpts);
		}
		if (!resp || !resp.ok) {
		    throw new Error(`[${label}] ${resp?.status || '??'} HTTP – ${resp?.statusText || 'Unknown error'}`);
		}
		const pkg = resp.body;
		if (!pkg || typeof pkg !== 'object'){
		    throw new Error(`[${label}] Invalid package format: expected a JSON object.`);
		}
		return this._resolve(pkg, lid, url, handler);
	    } catch (err) {
		const isSyntax = err instanceof SyntaxError;
		const errType = isSyntax ? "SyntaxError" : err.name || "Error";
		const msg = `[Repo] Failed to load package from ${url} (${errType})\n - ` +
		      (isSyntax
		       ?`[${label}] JSON syntax error in ${url}.\n - Ensure proper formatting (quoted keys, no trailing commas, etc.)\n - ${err.message}`
		       : `${err.message}`
		      );
		console.error(msg);
		errors.push({ url, err });
	    }
	}

	if (errors.length) {
	    const { url, err } = errors[0];
	    throw new Error(
		`Repo resolution failed (${errors.length} attempt${errors.length > 1 ? 's' : ''}).\n` +
		    `First failure: ${url} → ${err.message}`
	    );
	}

	throw new Error(`Package "${def}" not found in any repo.`);
    }


    /**
     * Internal helper to build a prioritized list of unique repository entries,
     * enriched with request options if available.
     *
     * @param {Array<string|object>|null} runtime - Repos passed during the request.
     *        Each entry may be a string or object { url, method, postData, fetchOpts }.
     * @param {Array<string>} order - Priority labels (e.g., ["runtime", "default"]).
     * @param {object} [opts={}] - Global fallback options (method, postData, fetchOpts).
     * @returns {Array<{ url: string, label: string, method: string, postData: *, fetchOpts: object }>}
     */
    _buildRepoList(runtime, order, opts = {}) {
	const repoLists = {
            runtime: runtime ? [].concat(runtime) : [],
            default: this.repos || [''],
            local: ['']
	};

	const seen = new Set();
	const result = [];

	for (const label of order) {
            const list = repoLists[label];
            if (!Array.isArray(list)) continue;

            for (const entry of list) {
		let url, method, postData, fetchOpts;

		if (typeof entry === 'string') {
                    url = entry;
                    method = opts.method;
                    postData = opts.postData;
                    fetchOpts = opts.fetchOpts;
		} else if (typeof entry === 'object' && entry.url) {
                    url = entry.url;
                    method = entry.method ?? opts.method;
                    postData = entry.postData ?? opts.postData;
                    fetchOpts = { ...(opts.fetchOpts || {}), ...(entry.fetchOpts || {}) };
		} else {
                    console.warn(`[Repo] Skipping invalid repo entry:`, entry);
                    continue;
		}

		// Normalize method (get/post only)
		method = typeof method === 'string' ? method.toLowerCase() : 'get';
		if (method !== 'get' && method !== 'post') {
                    console.warn(`[Repo] Invalid method '${method}' for repo ${url}. Defaulting to 'get'.`);
                    method = 'get';
		}

		// Final fetchOpts: enforce format:'full'
		fetchOpts = { ...fetchOpts, format: 'full' };

		if (!seen.has(url)) {
                    seen.add(url);
                    result.push({ url, label, method, postData, fetchOpts });
		}
            }
	}

	return result;
    }
    

    /**
     * Internal helper to finalize and optionally transform a resolved package definition.
     *
     * @param {object} def - The raw package definition object.
     * @param {string|false} lid - Local ID override; if falsey, original is kept.
     * @param {string|null} url - Optional URL where the package was fetched from.
     * @param {function|null} handler - Optional transform function to apply to the resolved package.
     * @returns {object} The finalized package object.
     */
    _resolve(def, lid = false, url = null, handler = null) {
	const resolved = {
            ...def,
            ...(lid ? { lid } : {})
	};

	if (url) {
            const base = url.replace(/[^/]+$/, '');
            resolved.__meta = { source: url, base };
	}

	return handler ? handler(resolved) : resolved;
    }
    
    /**
     * Constructs a full URL to a package definition.
     *
     * @param {string} repoBase - The base URL or path of the repo.
     * @param {string} def - Package ID (e.g. "scene:chess") or file path (e.g. "./chess.json").
     * @param {boolean|null} [isPath=null] - Force interpretation as path or ID; null = auto-detect.
     * @returns {string} The resolved full URL.
     */

    _buildPath(repoBase, def, isPath = null) {
	// Auto-detect if needed
	const pathMode = isPath !== null ? isPath : def.endsWith(".json") || def.startsWith(".");

	// Normalize base
	const cleanBase = repoBase.replace(/\/+$/, "");

	// Normalize def (handle both path and symbolic cases)
	const cleanDef = pathMode
              ? def.replace(/^\/+/, "")                                   // path: remove leading slashes
              : def.replace(/^\/+/, "").replace(":", "/") + ".json";      // symbolic: clean + convert

	return `${cleanBase}/${cleanDef}`;
    }
    
    
}



export default Repo;




# --- end: src/repo/Repo.js ---



# --- begin: src/repo/snip.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// small stable helpers
function stableStringify(obj) {
  if (obj == null) return '';
  if (typeof obj !== 'object') return String(obj);
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function hash32(str) {
  let h = 2166136261 >>> 0; // FNV-1a-ish
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function normalizeRepoItem(r) {
  if (typeof r === 'string') {
    const s = r.trim().replace(/\/+$/, '');
    return { url: s };
  }
  const out = { ...(r || {}) };
  if (out.url) out.url = String(out.url).trim().replace(/\/+$/, '');
  return out;
}

function repoFingerprint(repoList, method, postData, fetchOpts) {
  const list = (Array.isArray(repoList) ? repoList : []).map(normalizeRepoItem);
  const payload = {
    repos: list,
    method: method ? String(method).toLowerCase() : undefined,
    postData: postData ?? undefined,
    fetchOpts: fetchOpts ?? undefined,
  };
  return hash32(stableStringify(payload));
}

function looksLikeSymbolicId(s) {
  // e.g., "scene:chess" or "engine:square"
  return /^[a-z0-9_.-]+:[a-z0-9_.-]+$/i.test(s);
}

_makeCacheKey2(v) {
  if (!v) return null;

  // Raw string reference
  if (typeof v === 'string') {
    const s = v.trim();
    // If it looks symbolic (id:name), lowercase for consistency; else keep as-is (URLs/paths can be case-sensitive)
    return looksLikeSymbolicId(s) ? s.toLowerCase() : s;
  }

  // Inline package via { resource: { ... } }
  if (v.resource && typeof v.resource === 'object') {
    const inline = v.resource;
    if (inline.id) return String(inline.id).trim().toLowerCase();
    // No id → hash content for a stable key
    return `inline:${hash32(stableStringify(inline))}`;
  }

  // Normal case: { resource: "id-or-path", repo?, method?, postData?, fetchOpts? }
  if (v.resource && typeof v.resource === 'string') {
    const resRaw = v.resource.trim();
    const resKey = looksLikeSymbolicId(resRaw) ? resRaw.toLowerCase() : resRaw;

    if (v.repo && v.repo.length) {
      const fp = repoFingerprint(v.repo, v.method, v.postData, v.fetchOpts);
      return `${resKey}::${fp}`;
    }
    return resKey;
  }

  // Direct inline package object with { id: ... }
  if (v.id) return String(v.id).trim().toLowerCase();

  // Last resort: hash the structure
  return `anon:${hash32(stableStringify(v))}`;
}


# --- end: src/repo/snip.js ---



# --- begin: src/report/AssetLoadReport.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// packages/loaders/AssetLoadReport.js

/**
 * AssetLoadReport
 * ----------------
 * Tracks the outcome of an asset-loading pass for a single package.
 *
 * Usage:
 *   const report = new AssetLoadReport(pkg.id, { awaitAll: true });
 *   report.addInline("scene:chess/style", { type: "css" });
 *   report.addLoaded("scene:chess/board", { type: "html" }, resp);
 *   report.addFailed("scene:chess/sound", err, { url: "/repo/..." });
 *   report.finalize();
 *
 * Returned by AssetLoader._loadAssets(...), and can be bubbled up by callers.
 */
export class AssetLoadReport {
  /**
   * @param {string}  packageId       - Owning package id.
   * @param {object}  [opts]
   * @param {boolean} [opts.awaitAll] - Whether the batch was run with awaitAll.
   * @param {number}  [opts.limit]    - Concurrency limit (if relevant to caller).
   */
  constructor(packageId, { awaitAll = true, limit = undefined } = {}) {
    this.packageId   = packageId ?? null;

    // Timing
    this.startTime   = Date.now();
    this.endTime     = null;

    // Config echoes (useful in handlers)
    this.awaitAll    = !!awaitAll;
    this.limit       = limit;

    // Per-asset buckets
    this.inline      = [];   // [{ assetId, meta }]
    this.loaded      = [];   // [{ assetId, meta, response? }]
    this.failed      = [];   // [{ assetId, error, meta? }]

    // Aggregate counters (filled during finalize)
    this.total       = 0;
    this.loadedCount = 0;
    this.failedCount = 0;
    this.inlineCount = 0;

    // Overall outcome
    this.success     = false;

    // Optional raw batch results if caller wants to stash them
    // (e.g., the object returned by net.batch.run(...).results)
    this.batchResults = null;
  }

  /**
   * Record an inline asset (stored immediately without network).
   * @param {string} assetId
   * @param {object} [meta]
   */
  addInline(assetId, meta = {}) {
    this.inline.push({ assetId, meta });
  }

  /**
   * Record a successfully loaded remote asset.
   * @param {string} assetId
   * @param {object} [meta]
   * @param {any}    [response] - Optional transport-level response (e.g., m7Fetch full body)
   */
  addLoaded(assetId, meta = {}, response = undefined) {
    const rec = { assetId, meta };
    if (response !== undefined) rec.response = response;
    this.loaded.push(rec);
  }

  /**
   * Record a failed remote asset.
   * @param {string} assetId
   * @param {Error|string} error
   * @param {object} [meta]
   */
  addFailed(assetId, error, meta = {}) {
    this.failed.push({ assetId, error, meta });
  }

  /**
   * Optional: attach raw batch results for later inspection.
   * @param {object} batchResults - Whatever your batch runner returned per id.
   */
  setBatchResults(batchResults) {
    this.batchResults = batchResults;
  }

  /**
   * Compute totals and mark the report complete.
   * @returns {this}
   */
  finalize() {
    this.endTime     = Date.now();
    this.inlineCount = this.inline.length;
    this.loadedCount = this.loaded.length;
    this.failedCount = this.failed.length;
    this.total       = this.inlineCount + this.loadedCount + this.failedCount;
    this.success     = this.failedCount === 0;
    return this;
  }

  /**
   * Milliseconds spent (valid after finalize()).
   */
  get durationMs() {
    return this.endTime ? (this.endTime - this.startTime) : 0;
  }

  /**
   * Lightweight JSON-friendly summary (omit heavy payloads like response).
   */
  toJSON() {
    return {
      packageId:   this.packageId,
      success:     this.success,
      awaitAll:    this.awaitAll,
      limit:       this.limit,
      total:       this.total,
      loadedCount: this.loadedCount,
      failedCount: this.failedCount,
      inlineCount: this.inlineCount,
      durationMs:  this.durationMs,
      inline:      this.inline.slice(),
      loaded:      this.loaded.map(({ assetId, meta }) => ({ assetId, meta })),
      failed:      this.failed.map(({ assetId, error, meta }) => ({
        assetId,
        error: (error && error.message) ? error.message : String(error),
        meta
      })),
    };
  }

  /**
   * Convenience: build a report from simple counters/lists if needed.
   * Mostly for tests or adapter shims.
   */
  static buildReport(overrides = {}) {
    const rpt = new AssetLoadReport(overrides.packageId ?? null, {
      awaitAll: overrides.awaitAll,
      limit: overrides.limit
    });
    if (Array.isArray(overrides.inline)) {
      for (const it of overrides.inline) rpt.addInline(it.assetId, it.meta);
    }
    if (Array.isArray(overrides.loaded)) {
      for (const it of overrides.loaded) rpt.addLoaded(it.assetId, it.meta, it.response);
    }
    if (Array.isArray(overrides.failed)) {
      for (const it of overrides.failed) rpt.addFailed(it.assetId, it.error, it.meta);
    }
    return rpt.finalize();
  }
}

export default AssetLoadReport;


# --- end: src/report/AssetLoadReport.js ---



# --- begin: src/report/BootStrapLoadReport.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// report/bootstrapLoadReport.js
// Aggregates a repo-level report plus multiple package load reports.
// Designed to pair with BootStrap.load() and friends.
//
// Fields you can rely on after finalize():
//   - success: boolean (repo.success !== false AND all packages.success)
//   - repo: <RepoLoadReport|RepoResolveReport|null>
//   - packages: PackageLoadReport[]
//   - summary(): quick counters for dashboards
//   - toJSON(): compact transport format

export default class BootStrapLoadReport {
    constructor() {
	// timing
	this.startedAt = null;
	this.finishedAt = null;
	this.durationMs = 0;

	// inputs / context
	this.requested = {
	    pkgInstructions: null,
	    mountInstructions: null,
	    options: {}
	};

	// subreports
	this.repo = null;        // RepoLoadReport | RepoResolveReport | null
	this.packages = [];      // Array<PackageLoadReport>

	// outcome
	this.success = false;
	this.errors = [];
    }

    // -------- lifecycle --------

    start({ pkgInstructions = null, mountInstructions = null, options = {} } = {}) {
	this.startedAt = Date.now();
	this.requested.pkgInstructions = pkgInstructions ?? null;
	this.requested.mountInstructions = mountInstructions ?? null;
	this.requested.options = { ...options };
	return this;
    }

    finalize() {
	this.finishedAt = Date.now();
	this.durationMs = this.finishedAt - (this.startedAt ?? this.finishedAt);

	const repoOk = this.repo ? this.repo.success !== false : true;
	const allPkgsOk = this.packages.every(r => r && r.success);
	this.success = repoOk && allPkgsOk && this.errors.length === 0;

	return this;
	return {
	    success: this.success,
	    repo: this.repo,
	    packages: this.packages
	};
    }

    // -------- noters / mutators --------

    noteRepoReport(repoReport) {
	this.repo = repoReport || null;
	return this;
    }

    addPackageReport(pkgReport) {
	if (pkgReport) this.packages.push(pkgReport);
	return this;
    }

    noteError(err) {
	this.errors.push(err instanceof Error ? err.message : err);
	return this;
    }

    // -------- views --------

    summary() {
	const total = this.packages.length;
	const ok = this.packages.filter(r => r?.success).length;
	const failed = total - ok;

	const idsOk = this.packages
	      .filter(r => r?.success)
	      .map(r => r.pkgId ?? r.lid ?? null)
	      .filter(Boolean);

	const idsFailed = this.packages
	      .filter(r => !r?.success)
	      .map(r => r.pkgId ?? r.lid ?? null)
	      .filter(Boolean);

	return {
	    success: this.success,
	    durationMs: this.durationMs,
	    repo: { present: !!this.repo, success: this.repo ? !!this.repo.success : true },
	    packages: {
		total, ok, failed,
		idsOk,
		idsFailed
	    },
	    errorCount: this.errors.length
	};
    }

    toJSON() {
	// Compact transport form
	return {
	    success: this.success,
	    repo: this.repo,
	    packages: this.packages
	};
    }

    // Optional convenience: quick builder
    static build({ pkgInstructions, mountInstructions, options, repoReport, packageReports = [], errors = [] } = {}) {
	const report = new BootStrapLoadReport();
	report.start({ pkgInstructions, mountInstructions, options });
	if (repoReport) report.noteRepoReport(repoReport);
	for (const p of packageReports) report.addPackageReport(p);
	for (const e of errors) report.noteError(e);
	report.finalize();
	return report;
    }
}


# --- end: src/report/BootStrapLoadReport.js ---



# --- begin: src/report/ModuleLoadReport.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// packages/loaders/ModuleLoadReport.js

/**
 * ModuleLoadReport
 * ----------------
 * Tracks the outcome of a module-loading pass for a single package.
 *
 * Usage:
 *   const rpt = new ModuleLoadReport(pkg.id, { limit: 8 });
 *   rpt.addLoaded("scene:chess/logic", { type: "js" }, moduleRef);
 *   rpt.addFailed("scene:chess/ai", err, { url: "/repo/..." });
 *   rpt.finalize();
 *
 * Typically returned by ModuleLoader._loadModules(...) and bubbled upward.
 */
export class ModuleLoadReport {
    /**
     * @param {string}  packageId          - Owning package id.
     * @param {object}  [opts]
     * @param {number}  [opts.limit]       - Concurrency limit (if your loader uses one).
     * @param {boolean} [opts.awaitAll]    - Parity field with Asset report (optional).
     */
    constructor(packageId, { limit = undefined, awaitAll = true } = {}) {
	this.packageId   = packageId ?? null;

	// Timing
	this.startTime   = Date.now();
	this.endTime     = null;

	// Config echoes
	this.limit       = limit;
	this.awaitAll    = !!awaitAll;

	// Per-module buckets
	// NOTE: modules usually aren't "inline", but we mirror the structure for symmetry.
	this.loaded      = [];   // [{ moduleId, meta, module }]
	this.failed      = [];   // [{ moduleId, error, meta }]

	// Aggregate counters (computed in finalize)
	this.total       = 0;
	this.loadedCount = 0;
	this.failedCount = 0;

	// Overall outcome
	this.success     = false;

	// Optional raw results (e.g., Promise.all outcome array) for postmortem/debug
	this.rawResults  = null;
    }

    /**
     * Record a successfully loaded module.
     * @param {string} moduleId
     * @param {object} [meta]
     * @param {any}    [moduleRef] - The imported module reference (ESM namespace/object).
     */
    addLoaded(moduleId, meta = {}, moduleRef = undefined) {
	const rec = { moduleId, meta };
	if (moduleRef !== undefined) rec.module = moduleRef;
	this.loaded.push(rec);
    }

    /**
     * Record a failed module load.
     * @param {string} moduleId
     * @param {Error|string} error
     * @param {object} [meta]
     */
    addFailed(moduleId, error, meta = {}) {
	this.failed.push({ moduleId, error, meta });
    }

    /**
     * Attach raw loader results if desired (e.g., from Promise.all).
     * @param {any} results
     */
    setRawResults(results) {
	this.rawResults = results;
    }

    /**
     * Compute totals and mark as complete.
     * @returns {this}
     */
    finalize() {
	this.endTime     = Date.now();
	this.loadedCount = this.loaded.length;
	this.failedCount = this.failed.length;
	this.total       = this.loadedCount + this.failedCount;
	this.success     = this.failedCount === 0;
	return this;
    }

    /**
     * Milliseconds spent (valid after finalize()).
     */
    get durationMs() {
	return this.endTime ? (this.endTime - this.startTime) : 0;
    }

    /**
     * Lightweight JSON-safe summary (omits heavy module refs).
     */
    toJSON() {
	return {
	    packageId:   this.packageId,
	    success:     this.success,
	    limit:       this.limit,
	    awaitAll:    this.awaitAll,
	    total:       this.total,
	    loadedCount: this.loadedCount,
	    failedCount: this.failedCount,
	    durationMs:  this.durationMs,
	    loaded:      this.loaded.map(({ moduleId, meta }) => ({ moduleId, meta })),
	    failed:      this.failed.map(({ moduleId, error, meta }) => ({
		moduleId,
		error: (error && error.message) ? error.message : String(error),
		meta
	    })),
	};
    }

    /**
     * Convenience constructor for tests/adapters.
     */
    static buildReport(overrides = {}) {
	const rpt = new ModuleLoadReport(overrides.packageId ?? null, {
	    limit: overrides.limit,
	    awaitAll: overrides.awaitAll
	});

	if (Array.isArray(overrides.loaded)) {
	    for (const it of overrides.loaded) {
		rpt.addLoaded(it.moduleId, it.meta, it.module);
	    }
	}
	if (Array.isArray(overrides.failed)) {
	    for (const it of overrides.failed) {
		rpt.addFailed(it.moduleId, it.error, it.meta);
	    }
	}

	if (overrides.rawResults !== undefined) {
	    rpt.setRawResults(overrides.rawResults);
	}

	return rpt.finalize();
    }
}

export default ModuleLoadReport;


# --- end: src/report/ModuleLoadReport.js ---



# --- begin: src/report/PackageLoadReport.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// report/packageLoadReport.js
// Minimal report object for package load() outcomes.
// Shape aligns with load()'s return value and can be extended later.

export default class PackageLoadReport {
    constructor() {
	// timing
	this.startedAt = null;
	this.finishedAt = null;
	this.durationMs = 0;

	// pkg metadata
	this.pkg = null;
	this.pkgId = null;
	this.lid = null;

	// options/meta
	this.options = {};
	this.hooksRequested = false;
	this.hooksRan = false;
	this.hookSuccess = null;

	// results
	this.modules = null;   // moduleReport
	this.assets  = null;   // assetReport
	this.runner  = null;   // 'load' | 'error' | function name (if you want)
	this.handlerResult = undefined;

	// outcome
	this.success = false;
	this.errors = [];
    }

    // --- lifecycle ------------------------------------------------------------

    start({ pkg, options = {}, hooks = false } = {}) {
	this.startedAt = Date.now();
	if (pkg) this.notePackage(pkg);
	this.options = { ...options };
	this.hooksRequested = !!hooks;
	return this;
    }

    finalize() {
	this.finishedAt = Date.now();
	this.durationMs = this.finishedAt - (this.startedAt ?? this.finishedAt);
	// success mirrors your load() return contract:
	this.success = Boolean(this.modules?.success && this.assets?.success);
	// Return the exact shape your load() currently returns
	//return { success: this.success, modules: this.modules, assets: this.assets };
	return this;
    }

    // --- notes ---------------------------------------------------------------

    notePackage(pkg) {
	this.pkg = pkg || null;
	this.pkgId = pkg?.id ?? null;
	this.lid = pkg?.lid ?? pkg?.id ?? null;
	return this;
    }

    noteModules(moduleReport) {
	this.modules = moduleReport || null;
	return this;
    }

    noteAssets(assetReport) {
	this.assets = assetReport || null;
	return this;
    }

    noteHooksResult(result) {
	this.hooksRan = true;
	this.hookSuccess = !!result;
	return this;
    }

    noteRunner(nameOrFn) {
	this.runner = typeof nameOrFn === 'function'
	    ? (nameOrFn.name || '[anonymous]')
	    : (nameOrFn || null);
	return this;
    }

    noteHandlersResult(result) {
	this.handlerResult = result;
	return this;
    }

    noteError(err) {
	this.errors.push(err instanceof Error ? err.message : err);
	return this;
    }

    // --- views ---------------------------------------------------------------

    summary() {
	return {
	    success: this.success,
	    durationMs: this.durationMs,
	    id: this.pkgId,
	    lid: this.lid,
	    modules: { success: this.modules?.success ?? false },
	    assets:  { success: this.assets?.success ?? false },
	    hooks: {
		requested: this.hooksRequested,
		ran: this.hooksRan,
		success: this.hookSuccess
	    },
	    runner: this.runner,
	    errorCount: this.errors.length
	};
    }

    toJSON() {
	// Minimal transport form (same shape as load() return)
	return { success: this.success, modules: this.modules, assets: this.assets };
    }

    // Optional convenience factory if you like one-liners
    static build({ pkg, options, moduleReport, assetReport, hooksRequested = false, hookResult = null, runner = null, handlerResult } = {}) {
	const r = new PackageLoadReport();
	r.start({ pkg, options, hooks: hooksRequested });
	r.noteModules(moduleReport);
	r.noteAssets(assetReport);
	if (hookResult !== null) r.noteHooksResult(hookResult);
	if (runner) r.noteRunner(runner);
	if (arguments.length >= 1 && 'handlerResult' in arguments[0]) r.noteHandlersResult(handlerResult);
	r.finalize();
	return r;
    }
}


# --- end: src/report/PackageLoadReport.js ---



# --- begin: src/report/RepoResolveReport.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// Lightweight report object used by Repo.buildDependencyGraph()
// Focused API: startRun, noteInput, noteSkip, noteVisitStart, noteNormalizedResource,
// noteResolveFail, noteResolveSuccess, noteDependencies, noteOrdered, noteEnqueue,
// finishRun (+ finalize alias), summary(), toJSON()
// Default export: RepoResolveReport

export default class RepoResolveReport {
    constructor(opts = {}) {
	// Timing
	this.startedAt = null;
	this.finishedAt = null;
	this.durationMs = 0;

	// Run metadata
	this.options = {};
	this.input = undefined;

	// Core tracking
	this.skips = [];                   // { node, reason, key, time }
	this.visits = [];                  // { node, event:'visit_start', time }
	this.normalized = [];              // { sig, type, stem, reposCount, time }
	this.resourceSignatures = new Set();

	this.resolveFailures = [];         // { node, reason }
	this.resolveSuccesses = [];        // { id, source, repo }

	this.dependencies = new Map();     // id -> string[]
	this.edges = [];                   // { from, to }
	this.ordered = [];                 // [id...]
	this._positions = new Map();       // id -> order index (1-based per caller arg)

	this.enqueued = [];                // in the order they were queued (unique)
	this._enqueuedSet = new Set();

	this.errors = [];                  // optional external errors if ever recorded

	// Outcome
	this.success = false;              // set in finishRun/finalize
    }

    // --- lifecycle -------------------------------------------------------------

    startRun(options = {}) {
	this.startedAt = Date.now();
	this.options = { ...options };
	return this;
    }

    noteInput(input) {
	this.input = input;
	return this;
    }

    finishRun({ total } = {}) {
	this.finishedAt = Date.now();
	this.durationMs = this.finishedAt - (this.startedAt ?? this.finishedAt);

	// A run is considered successful if no explicit errors or resolveFailures were recorded
	this.success = this.errors.length === 0 && this.resolveFailures.length === 0;

	// Allow callers to stash a total output count (purely informational)
	this.total = typeof total === 'number' ? total : undefined;

	return this;
    }

    // Alias some codebases expect
    finalize(args) {
	return this.finishRun(args);
    }

    // --- notes from Repo.buildDependencyGraph() --------------------------------

    noteSkip({ node, reason = '', key = '' }) {
	this.skips.push({ node, reason, key, time: Date.now() });
	return this;
    }

    noteVisitStart(node) {
	this.visits.push({ node, event: 'visit_start', time: Date.now() });
	return this;
    }

    // Accepts "norm" but also tolerates undefined (Repo.js currently passes a var named `norm`)
    noteNormalizedResource(norm) {
	const sig = this.constructor.sigFromNormalized(norm);
	if (sig && !this.resourceSignatures.has(sig)) {
	    this.resourceSignatures.add(sig);
	    this.normalized.push({
		sig,
		type: norm?.type ?? 'unknown',
		stem: norm?.stem ?? null,
		reposCount: Array.isArray(norm?.repos) ? norm.repos.length : 0,
		time: Date.now()
	    });
	}
	return sig;
    }

    noteResolveFail({ node, reason = 'unspecified' } = {}) {
	this.resolveFailures.push({ node, reason });
	return this;
    }

    noteResolveSuccess(def = {}) {
	// keep a small, portable view; `__meta.source` is where Repo stores the fetch URL
	this.resolveSuccesses.push({
	    id: def.id ?? null,
	    source: def.__meta?.source ?? null,
	    repo: def.repo ?? null
	});
	return this;
    }

    noteDependencies(id, deps) {
	const list = Array.isArray(deps) ? deps.slice() : [];
	this.dependencies.set(id, list);
	for (const d of list) {
	    this.edges.push({ from: id, to: String(d) });
	}
	return this;
    }

    // Repo calls: noteOrdered(def.id, out.length)
    noteOrdered(id, position /* optional */) {
	if (id != null) this.ordered.push(id);
	if (id != null && typeof position === 'number') {
	    this._positions.set(id, position);
	}
	return this;
    }

    noteEnqueue(item) {
	const key = this.constructor._key(item);
	if (!this._enqueuedSet.has(key)) {
	    this._enqueuedSet.add(key);
	    this.enqueued.push(item);
	}
	return this;
    }

    // --- utilities -------------------------------------------------------------

    static sigFromNormalized(norm) {
	if (!norm || typeof norm !== 'object') return 'unknown';
	const type = norm.type ?? 'unknown';
	const stem = norm.stem ?? '';
	const repos = Array.isArray(norm.repos) ? norm.repos : [];
	const repoSig = repos
	      .map(r => `${(r?.method || 'get').toLowerCase()}:${(r?.url || '').toLowerCase()}`)
	      .join(',');
	return `${type}|${stem}|${repoSig}`;
    }

    static _key(v) {
	if (v == null) return 'null';
	if (typeof v === 'string') return `s:${v}`;
	if (typeof v === 'object') {
	    if (typeof v.id === 'string') return `id:${v.id}`;
	    if (typeof v.resource === 'string') return `res:${v.resource}`;
	    try { return `j:${JSON.stringify(v)}`; } catch { /* fall through */ }
	}
	return String(v);
    }

    // --- reporting -------------------------------------------------------------

    summary() {
	return {
	    success: this.success,
	    durationMs: this.durationMs,
	    startedAt: this.startedAt,
	    finishedAt: this.finishedAt,

	    // counts
	    enqueued: this.enqueued.length,
	    visits: this.visits.length,
	    uniqueResources: this.resourceSignatures.size,
	    resolved: this.resolveSuccesses.length,
	    resolveFailures: this.resolveFailures.length,
	    edges: this.edges.length,
	    ordered: this.ordered.length,
	    skips: this.skips.length,
	    errors: this.errors.length,

	    // optional info
	    total: this.total
	};
    }

    toJSON() {
	// A compact, stable snapshot that’s safe to log or send over the wire
	return {
	    success: this.success,
	    startedAt: this.startedAt,
	    finishedAt: this.finishedAt,
	    durationMs: this.durationMs,
	    total: this.total,

	    // inputs
	    input: this.input,
	    options: this.options,

	    // high-level results
	    uniqueResources: this.resourceSignatures.size,
	    resolved: this.resolveSuccesses.map(x => x.id).filter(Boolean),
	    failures: this.resolveFailures,
	    edges: this.edges,

	    // order & queue
	    ordered: this.ordered.slice(),
	    orderIndex: Object.fromEntries(this._positions),
	    enqueuedCount: this.enqueued.length,

	    // misc
	    skips: this.skips,
	    errors: this.errors
	};
    }
}


# --- end: src/report/RepoResolveReport.js ---



# --- begin: src/runners/Runners.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/*
  helper class for translating '#' symbolics to the the local system, b/c run handlers passes arguments in an unfriendly way.
 */
export class Runners {
    constructor(bootstrap){
	this.bootstrap = bootstrap;
    }

    mount(sys,ctx){
	const reports = ctx?.report?.packages ?? [];
	for (const report of reports){
	    if (!report?.pkgId) continue;
	    this.bootstrap.mount.load(report.pkgId);	    
	}

    }

    unmount(sys,ctx){
	const reports = ctx?.report?.packages ?? [];
	for (const report of reports){
	    if (!report?.pkgId) continue;
	    this.bootstrap.mount.unload(report.pkgId);	    
	}
    }
}

export default Runners;


# --- end: src/runners/Runners.js ---



# --- begin: src/utils/concurrencyLimiter.js ---

/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */

export function concurrencyLimiter(maxConcurrent = 8) {
    let activeCount = 0;
    const queue = [];

    const next = () => {
        if (queue.length === 0 || activeCount >= maxConcurrent) {
            return;
        }
        activeCount++;
        const { fn, resolve, reject } = queue.shift();
        Promise.resolve()
            .then(fn)
            .then(result => {
                resolve(result);
            })
            .catch(err => {
                reject(err);
            })
            .finally(() => {
                activeCount--;
                next();
            });
    };

    return function limit(fn) {
        return new Promise((resolve, reject) => {
            queue.push({ fn, resolve, reject });
            next();
        });
    };
}


export default concurrencyLimiter;


# --- end: src/utils/concurrencyLimiter.js ---

