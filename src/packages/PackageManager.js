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

    _parseSymbol(entry) {
	const [pkgID, localMod, ...fnParts] = String(entry).split('.');
	return {
	    modID: `${pkgID}/${localMod}`,      // "ui:console/logic"
	    fnPath: fnParts.join('.') || null,  // "init" or "init.sub"
	};
    }

    
    _getSymbolicFunction(entry, bind = false) {
	if (typeof entry !== 'string' || entry ==='') return undefined;
	const { modID, fnPath } = parseSymbol(entry);
	//const [modID, fnPath] = entry.split('.', 2);
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
