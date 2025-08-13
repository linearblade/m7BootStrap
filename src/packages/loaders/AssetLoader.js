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
