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
