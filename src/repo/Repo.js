/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
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
     * Resolves a resource definition from a symbolic ID, URL, or instruction object.
     *
     * This method normalizes flexible input formats and forwards the resolution
     * to `.load()` with extracted configuration. It supports:
     *
     * - A string → treated as a symbolic resource ID or path (passed to `.load`)
     * - An object → expects shape: `{ resource, repo?, ... }`
     *
     * This provides a unified entry point for higher-level systems like BootStrap
     * to resolve packages, mounts, or any other resource type without worrying about
     * input normalization.
     *
     * @param {string|object} input - A resource ID string or structured instruction object.
     * @param {object} [opts={}] - Optional extra options passed to `.load()`.
     * @returns {Promise<object|null>} - The resolved object, or null if resolution fails.
     *
     * @example
     * await repo.resolve("scene:chess");
     *
     * @example
     * await repo.resolve({ resource: "engine:square", repo: ["/custom/engine/"] });
     */

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
    /*
    async resolve(input, opts = {}) {
	if (typeof input === 'string') {
            return await this.load(input, opts);
	}

	if (input && typeof input === 'object') {
            const { resource, repo, ...rest } = input;
            return await this.load(resource, { repo, ...opts, ...rest });
	}

	console.warn("[Repo] Invalid input to resolve:", input);
	return null;
    }
    */
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
     * Internal helper to build a prioritized list of unique repository URLs.
     *
     * @param {Array<string>|null} runtime - The repo(s) provided at runtime.
     * @param {Array<string>} order - Priority labels (e.g., ["runtime", "default"]).
     * @returns {Array<string>} Ordered, de-duplicated list of repo endpoints.
     */
    /*
    _buildRepoList(runtime, order) {
	const repoLists = {
            runtime: runtime ? [].concat(runtime) : [],
            default: this.repos || [''],
	    local : [''],
	};

	const seen = new Set();
	const result = [];

	for (const label of order) {
            const list = repoLists[label];
            if (Array.isArray(list)) {
		for (const url of list) {
                    if (!seen.has(url)) {
			seen.add(url);
			result.push(url);
                    }
		}
            }
	}

	return result;
    }*/

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
