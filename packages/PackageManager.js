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

	this.packages   = new Map();   // Cache of loaded packages by local ID
	this.assets     = new Map();     // Registry of loaded assets (DOM, CSS, etc.)
	this.assetsMeta = new Map();     // Registry of loaded meta data assets (DOM, CSS, etc.) (extract from both pkg and return data)
	this.modules    = new Map();    // Loaded JS module references

	this.repo = this.bootstrap.repo;
    }


    /**
     * Checks whether a package with the given ID is already loaded.
     *
     * @param {string} id - The local ID of the package to check.
     * @returns {boolean} - True if the package is already loaded, false otherwise.
     */
    isLoaded(id) {
	if (!id || typeof id !== 'string') return false;
	return this.packages.has(id);
    }
    
    /**
     * Loads a package by ID or JSON path.
     * @param {string|object} def - Package ID or direct definition
     * @returns {Promise<void>}
     */

    async load(pkg) {
	//we will handle this later.
	//const pkg = await this.repo.load(def);
	if (!pkg || typeof pkg !== 'object') {
            throw new Error("loadPackage() requires a fully resolved package object.");
	}

	const lid = pkg.lid || pkg.id;
	
	if (this.packages.has(lid)) {
            console.warn(`Package "${lid}" already loaded.`);
            return;
	}

	// Cache the definition
	this.packages.set(lid, pkg);
	const assetSuccess = await this._loadAssets(pkg);
	const modSuccess   = await this._loadModules(pkg);
	if (!assetSuccess || !modSuccess) return false;
	const hookSuccess = await this._runHooks(pkg);
	return hookSuccess;

	// TODO: load requires → load assets → run hooks

	        // TODO:
        // - resolve remote path if string and ends in .json
        // - resolve local package from registry otherwise
        // - check for already-loaded
        // - load requires
        // - load assets
        // - run hooks

    }


    async _runHooks(pkg) {
	if (!pkg?.run || !Array.isArray(pkg.run)) return true;
	let success = true;
	for (const entry of pkg.run) {
	    const fn = this.bootstrap.constructor.LIBFUNCGET(entry);
	    try {
		if (fn) {
		    await fn(); // Direct function
		} else if (typeof entry === 'string' && entry.startsWith('@')) {
		    const [modID, fnName] = entry.slice(1).split('.');
		    const mod = this.modules.get(modID);
		    const fn = mod?.[fnName];

		    if (typeof fn === 'function') {
			await fn();
		    } else {
			console.warn(`[BootStrap] Missing function '${fnName}' in module '${modID}'`);
			success = false;
		    }
		} else {
		    console.warn(`[BootStrap] Unsupported run hook:`, entry);
		    success = false;
		}
	    } catch (err) {
		console.error(`[BootStrap] Error in run hook '${entry}':`, err);
		success = false;
	    }
	}
	return success;
    }

    async _loadModules(pkg) {
	const base = pkg.__meta?.base || '';
	const mods = pkg.modules || [];

	for (const { id, url } of mods) {
	    const fullURL = base + url;
	    try {
		const mod = await this.net.modules.load(id,fullURL);
		this.modules.set(id, mod);
	    } catch (err) {
		console.warn(`Failed to import module: ${id} → ${fullURL}`, err);
		return false;
	    }
	}
	return true;
    }

    /**
     * Internal: Loads all assets from a package.
     *
     * @param {object} pkg - A full package object containing an `assets` array.
     * @returns {Promise<void>}
     */

    async _loadAssets(pkg) {
	if (!pkg?.assets || !Array.isArray(pkg.assets)) return;

	const base = pkg.__meta?.base || '';
	const prefix = `${pkg.id}/`; // Prepend this to all asset IDs
	
	const loadList = [];
	for (const asset of pkg.assets) {

	    const fullID = prefix + asset.id;
	    
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
	    this.assetsMeta.set(fullID, meta);
	    
	    if (asset.inline) {
		this.assets.set(fullID, asset.content); //store asset separately so we dont have structure hell
		meta.loaded = true; // still have reference to stored data.
		continue;
	    }
	    const listEntry = {
		id: fullID,
		url: `${base}${asset.url}`,
		type: asset.type || null,
		method: asset.method || 'get',           // Default to GET if unspecified
		opts: asset.fetchOpts || {},             // Optional fetch options (e.g., headers, credentials)
		data: asset.postData || null 
	    };
	    //console.warn(listEntry);
	    loadList.push(listEntry);
	    /*
	    loadList.push({
		id: fullID,
		url: `${base}${asset.url}`,
		type: asset.type
	    });*/
	}
	if (!loadList.length) return true;

	// Use net.batch
	const oldHandler = this.net.batch.batchHandler;
	this.net.batch.setBatchHandler(this.net.batch.batchStatus); // use default behavior (batchStatus);
	

	
	const {sync,results:batchResults} = await  this.net.batch.run(
	    loadList,
	    (opts) => {
		//console.log(`pulled ${opts.trigger}`,opts);
	    },
	    ({ trigger }) => {
		//console.warn(`Failed to load asset: ${trigger}`);
	    },
	    {awaitAll:true}
	);

	//console.warn([this.net.batch.context,sync.controller, sync.failed(),batchResults]);
	//window.sync = sync;
	this.net.batch.setBatchHandler(oldHandler); // restore if needed
	for (const {id} of loadList){
	    //console.log(`storing ${id}`, batchResults[id] ); //this.net.batch.get(id)
	    this.assets.set(id,batchResults[id]); //this.net.batch.context[id]
	    const meta = this.assetsMeta.get(id);
            if (meta) {
		meta.loaded = true;
            }
	}
	if (sync.failed() ){
	    // handle a failure
	    return false;
	}
	return true;
	//for (const k in sync.controller.fail)console.warn(k);

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
	const meta = this.assetsMeta.get(id);
	if (!meta) return undefined;

	return {
            content: this.assets.get(id), // May be undefined if not loaded
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
	for (const [id, meta] of this.assetsMeta.entries()) {
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
	for (const [id, meta] of this.assetsMeta.entries()) {
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
    for (const [id, meta] of this.assetsMeta.entries()) {
        if (meta.packageID !== pkgId) continue;
        if (!filter || this.constructor.filterMatch(meta, filter)) {
            result[id] = this._assetEntry(id);
        }
    }
    return result;
}   

    /**
     * Evaluates all run instructions in order.
     * @param {Array<Function|string|object>} runList
     */
    async runHooks(runList) {
        // TODO:
        // - resolve string refs like "@id.fn"
        // - resolve { call, args }
        // - fallback to global function names
    }

    /**
     * Optional helper to unload assets by group or package ID.
     * @param {string} id
     */
    unloadPackage(id) {
        // TODO: use domRegistry.clear(id), remove cached entries
    }
}
export default PackageManager;
