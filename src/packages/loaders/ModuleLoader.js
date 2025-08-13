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
