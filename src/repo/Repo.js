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


