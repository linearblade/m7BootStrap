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
	pkg.__meta = {...(pkg?.__meta??{}), hooks };
	this.data.packages.set(lid, pkg);

	if (hooks) {
	    const key = moduleReport.success && assetReport.success?'Load':'Error';
	    //console.warn("have hooks,",key);
	    const hookSuccess = await this._runHooksFromPackage(pkg,`package${key}`,{pkg,report});
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
    async unload(pkgId, { keepAssets = false, keepModules = false,hooks } = {}) {
	if (!pkgId || !this.isLoaded(pkgId)) return false;
	const pkg = this.data.packages.get(pkgId);
	if (!pkg)  return false;
	//look up whether hooks was previously defined and use that if not specified.
	if (hooks === undefined && pkg.__meta.hooks) hooks = pkg.__meta.hooks;

	// 1) run hooks first! otherwise you might unload the package
	if (hooks){
	    const hookSuccess = await this._runHooksFromPackage(pkg,'packageUnload',{pkg});
	}

	// 2) remove assets for this package (unless kept)
	if (!keepAssets) {
	    this.assets.unload(pkgId);
	}

	// 3) remove modules for this package (unless kept)
	if (!keepModules) {
	    this.modules.unload(pkgId);
	}
	// 4) finally drop the package record itself
	this.data.packages.delete(pkgId);
	
	return true;
    }


    _parseSymbol(entry) {
	const s = String(entry).trim();
	const dot = s.indexOf('.');
	const modID = dot === -1 ? s : s.slice(0, dot);       // "ui:console/logic"
	const fnPath = dot === -1 ? null : s.slice(dot + 1);  // "init" (or "init.sub")
	return { modID, fnPath };
    }
    /*
    _parseSymbol(entry) {
        const [pkgMod, ...fnParts] = String(entry).split('.');
        //const [modID, ...rest] = entry.split('.');
        //const fnPath = rest.join('.');
	//console.log(pkgMod,fnParts);
        return {
            modID: pkgMod,      // "ui:console/logic"
            fnPath: fnParts.join('.') || null,  // "init" or "init.sub"
        };
    }*/
    
    _getSymbolicFunction(entry, bind = false) {
	if (typeof entry !== 'string' || entry ==='') return undefined;
	const { modID, fnPath } = this._parseSymbol(entry);
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


    async _runHooksFromPackage(pkg,type='load',ctx) {
        const runner = pkg?.hooks?.[type] ?? null;
        if (!runner || !Array.isArray(runner) ) return true;
        return await this.bootstrap._runHandlers(runner, ctx, `[PACKAGE-HOOK] [${type}] ${pkg.id}`,pkg.id);
    }
    async runHooks(pkg,runList = [],ctx) {
        return await this.bootstrap._runHandlers(runList, ctx, `[PACKAGE-HOOK] ['pre mount'] ${pkg.id}`,pkg.id);
    }
    
    // split a package's run list into phases
    _partitionRuns(runList = []) {
	const out = { pre: [], post: [], idle: [] };

	// Accept some synonyms so package authors have wiggle room
	const PRE   = new Set(['pre', 'premount', 'pre-mount', 'postload', 'post-load']);
	const POST  = new Set(['post', 'postmount', 'post-mount', 'mount']); // default bucket
	const IDLE  = new Set(['idle']);

	for (const h of runList) {
	    if (!h) continue;

	    const ds = this.bootstrap._destructureFunctionResource(h);
	    if (!ds || !ds.fn) continue;                 // skip malformed

	    const w = (ds.when == null ? 'post' : String(ds.when)).trim().toLowerCase();

	    if (PRE.has(w)) {
		out.pre.push(ds);
	    } else if (IDLE.has(w)) {
		out.idle.push(ds);
	    } else if (POST.has(w)) {
		out.post.push(ds);
	    } else {
		out.post.push(ds);
	    }
	}
	return out;
    }

    
    d_partitionRuns(runList = []) {
	const out = { pre: [], post: [], idle: [] };
	const preVals  = ['postload', 'premount','pre'];
	const idleVals = ['idle'];
	const postVals = ['post'];

	for (const h of runList) {
	    if (!h) continue;
	    const ds = this.bootstrap._destructureFunctionResource(h);
	    const when = ds?.when;
	    if(!when) { // majority use case
		out.post.push(ds);
	    }else if (preVals.includes(when ) ){
		out.pre.push(ds);
	    }else if (postVals.includes(when) ) {
		out.post.push(ds);
	    }else if (idleVals.includes(when) ) {
		out.idle.push(ds);
	    }else {
		out.post.push(ds);
	    }
	}
	return out;
    }



}
export default PackageManager;
