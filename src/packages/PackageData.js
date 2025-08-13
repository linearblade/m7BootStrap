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
