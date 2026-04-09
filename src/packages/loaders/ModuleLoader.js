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

    async loadFromBundle(bundle, options = {}) {
	const pkg = bundle?.package?.data;
	if (!pkg || typeof pkg !== 'object') {
            throw new Error("loadFromBundle() requires a bundled package object.");
	}

	const lid = pkg.lid || pkg.id;
	if (!lid) {
	    throw new Error("loadFromBundle() requires a package with an 'id' (or 'lid').");
	}

	const pkgID = pkg.id || lid;
	pkg.id = pkgID;
	pkg.lid = pkg.lid || lid;

	const {   limit = options?.limit ?? 8,   awaitAll = true,load:loadHandler,error:errorHandler,itemLoad:itemLoadHandler = null,itemError:itemErrorHandler = null } = options?.module || {};
	const base = pkg.__meta?.base || bundle?.meta?.base || '';
	const mods = Array.isArray(bundle?.modules) ? bundle.modules : [];
	const report = new ModuleLoadReport(pkg.id, { limit, awaitAll });
	const locationHref = globalThis?.location?.href || 'http://localhost/';
	const bundleBaseUrl = (() => {
	    try {
		return new URL(base || '/', locationHref).href;
	    } catch {
		return locationHref;
	    }
	})();

	if (this.controller.isLoaded(lid)) {
            console.warn(`Package "${lid}" already loaded.`);
            return report.finalize();
	}

	if (!mods.length) return report.finalize();

	const moduleIndex = new Map();
	for (const entry of mods) {
	    if (!entry || typeof entry !== 'object') continue;
	    const entryId = typeof entry.id === 'string' ? entry.id.trim() : '';
	    const entryUrl = typeof entry.url === 'string' ? entry.url.trim() : '';
	    if (!entryId || !entryUrl) continue;

	    try {
		const originalUrl = new URL(entryUrl, bundleBaseUrl).href;
		moduleIndex.set(originalUrl, {
		    ...entry,
		    id: entryId,
		    url: entryUrl,
		    originalUrl,
		});
	    } catch {
		continue;
	    }
	}

	const runtimeUrlCache = new Map();
	const resolving = new Set();

	const isRelativeSpecifier = (specifier) => (
	    typeof specifier === 'string'
	    && (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/'))
	);

	const asyncReplace = async (text, pattern, replacer) => {
	    let out = '';
	    let lastIndex = 0;

	    for (const match of text.matchAll(pattern)) {
		const index = match.index ?? 0;
		const full = match[0];
		out += text.slice(lastIndex, index);
		out += await replacer(match);
		lastIndex = index + full.length;
	    }

	    out += text.slice(lastIndex);
	    return out;
	};

	const resolveRuntimeUrl = async (originalUrl) => {
	    if (runtimeUrlCache.has(originalUrl)) {
		return runtimeUrlCache.get(originalUrl);
	    }

	    if (resolving.has(originalUrl)) {
		throw new Error(`Circular bundled module dependency detected while resolving ${originalUrl}`);
	    }

	    const entry = moduleIndex.get(originalUrl);
	    if (!entry) {
		throw new Error(`Bundled module dependency not found: ${originalUrl}`);
	    }

	    resolving.add(originalUrl);
	    try {
		const rewriteSpecifier = async (specifier) => {
		    if (!isRelativeSpecifier(specifier)) {
			return specifier;
		    }

		    const targetUrl = new URL(specifier, originalUrl).href;
		    if (!moduleIndex.has(targetUrl)) {
			// Preserve normal relative-import behavior for modules that were not
			// included in the bundle. This falls back to the original file URL.
			return targetUrl;
		    }

		    return await resolveRuntimeUrl(targetUrl);
		};

		let source = String(entry.data ?? '');
		if (!source.trim()) {
		    throw new Error(`Empty bundled module source for ${entry.originalUrl}`);
		}

		// Keep the original file URL visible to module code that uses import.meta.url.
		source = source.replace(/\bimport\.meta\.url\b/g, JSON.stringify(originalUrl));

		source = await asyncReplace(
		    source,
		    /(\b(?:import|export)\b[\s\S]*?\bfrom\s*)(['"])([^'"]+)\2/g,
		    async (match) => {
			const prefix = match[1];
			const quote = match[2];
			const spec = match[3];
			const resolved = await rewriteSpecifier(spec);
			return `${prefix}${quote}${resolved}${quote}`;
		    }
		);

		source = await asyncReplace(
		    source,
		    /(\bimport\s*)(['"])([^'"]+)\2/g,
		    async (match) => {
			const prefix = match[1];
			const quote = match[2];
			const spec = match[3];
			const resolved = await rewriteSpecifier(spec);
			return `${prefix}${quote}${resolved}${quote}`;
		    }
		);

		source = await asyncReplace(
		    source,
		    /(\bimport\s*\(\s*)(['"])([^'"]+)\2(\s*\))/g,
		    async (match) => {
			const prefix = match[1];
			const quote = match[2];
			const spec = match[3];
			const suffix = match[4];
			const resolved = await rewriteSpecifier(spec);
			return `${prefix}${quote}${resolved}${quote}${suffix}`;
		    }
		);

		const dataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(`${source}\n//# sourceURL=${originalUrl}`)}`;
		runtimeUrlCache.set(originalUrl, dataUrl);
		return dataUrl;
	    } finally {
		resolving.delete(originalUrl);
	    }
	};

	const results = [];

	for (const entry of mods) {
	    if (!entry || typeof entry !== 'object') continue;
	    const entryId = typeof entry.id === 'string' ? entry.id.trim() : '';
	    const entryUrl = typeof entry.url === 'string' ? entry.url.trim() : '';
	    if (!entryId || !entryUrl) continue;

	    const originalUrl = (() => {
		try {
		    return new URL(entryUrl, bundleBaseUrl).href;
		} catch {
		    return null;
		}
	    })();
	    if (!originalUrl) continue;

	    const fullID = this.controller.utils.scopedKey(pkgID, entryId);
	    const meta = {
		...entry,
		id: fullID,
		originalID: entryId,
		packageID: pkgID,
		base,
		loaded: false,
		source: entry
	    };

	    this.data.modulesMeta.set(fullID, meta);

	    try {
		const runtimeUrl = await resolveRuntimeUrl(originalUrl);
		const mod = await import(runtimeUrl);
		meta.loaded = true;
		this.data.modules.set(fullID, mod);
		report.addLoaded(fullID, { meta }, mod);
		results.push({ status: 'fulfilled', id: fullID, mod });
		await this.bootstrap._runHandlers(
		    itemLoadHandler,
		    { pkg, report, module: { status: 'fulfilled', id: fullID, mod } },
		    `[MODULE-BUNDLE-ITEM-LOAD - ${pkg.id} - ${fullID}]`,
		    pkg.id
		);
	    } catch (err) {
		meta.loaded = false;
		meta.error = err;
		report.addFailed(fullID, err, { meta });
		results.push({ status: 'rejected', id: fullID, err });
		console.warn(`Failed to import bundled module: ${fullID}`, err);
		await this.bootstrap._runHandlers(
		    itemErrorHandler,
		    { pkg, report, module: { status: 'rejected', id: fullID, err } },
		    `[MODULE-BUNDLE-ITEM-ERROR - ${pkg.id} - ${fullID}]`,
		    pkg.id
		);
	    }
	}

	report.setRawResults(results);
	report.finalize();
	const [runner,rtype] = report.success?[loadHandler,'LOAD']:[errorHandler,'ERROR'];
        await this.bootstrap._runHandlers(runner, {pkg, report }, `[MODULE-BUNDLE-${rtype} - ${pkg.id}]`,pkg.id);
	
	return report;
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
