/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// report/packageLoadReport.js
// Minimal report object for package load() outcomes.
// Shape aligns with load()'s return value and can be extended later.

export default class PackageLoadReport {
    constructor() {
	// timing
	this.startedAt = null;
	this.finishedAt = null;
	this.durationMs = 0;

	// pkg metadata
	this.pkg = null;
	this.pkgId = null;
	this.lid = null;

	// options/meta
	this.options = {};
	this.hooksRequested = false;
	this.hooksRan = false;
	this.hookSuccess = null;

	// results
	this.modules = null;   // moduleReport
	this.assets  = null;   // assetReport
	this.runner  = null;   // 'load' | 'error' | function name (if you want)
	this.handlerResult = undefined;

	// outcome
	this.success = false;
	this.errors = [];
    }

    // --- lifecycle ------------------------------------------------------------

    start({ pkg, options = {}, hooks = false } = {}) {
	this.startedAt = Date.now();
	if (pkg) this.notePackage(pkg);
	this.options = { ...options };
	this.hooksRequested = !!hooks;
	return this;
    }

    finalize() {
	this.finishedAt = Date.now();
	this.durationMs = this.finishedAt - (this.startedAt ?? this.finishedAt);
	// success mirrors your load() return contract:
	this.success = Boolean(this.modules?.success && this.assets?.success);
	// Return the exact shape your load() currently returns
	//return { success: this.success, modules: this.modules, assets: this.assets };
	return this;
    }

    // --- notes ---------------------------------------------------------------

    notePackage(pkg) {
	this.pkg = pkg || null;
	this.pkgId = pkg?.id ?? null;
	this.lid = pkg?.lid ?? pkg?.id ?? null;
	return this;
    }

    noteModules(moduleReport) {
	this.modules = moduleReport || null;
	return this;
    }

    noteAssets(assetReport) {
	this.assets = assetReport || null;
	return this;
    }

    noteHooksResult(result) {
	this.hooksRan = true;
	this.hookSuccess = !!result;
	return this;
    }

    noteRunner(nameOrFn) {
	this.runner = typeof nameOrFn === 'function'
	    ? (nameOrFn.name || '[anonymous]')
	    : (nameOrFn || null);
	return this;
    }

    noteHandlersResult(result) {
	this.handlerResult = result;
	return this;
    }

    noteError(err) {
	this.errors.push(err instanceof Error ? err.message : err);
	return this;
    }

    // --- views ---------------------------------------------------------------

    summary() {
	return {
	    success: this.success,
	    durationMs: this.durationMs,
	    id: this.pkgId,
	    lid: this.lid,
	    modules: { success: this.modules?.success ?? false },
	    assets:  { success: this.assets?.success ?? false },
	    hooks: {
		requested: this.hooksRequested,
		ran: this.hooksRan,
		success: this.hookSuccess
	    },
	    runner: this.runner,
	    errorCount: this.errors.length
	};
    }

    toJSON() {
	// Minimal transport form (same shape as load() return)
	return { success: this.success, modules: this.modules, assets: this.assets };
    }

    // Optional convenience factory if you like one-liners
    static build({ pkg, options, moduleReport, assetReport, hooksRequested = false, hookResult = null, runner = null, handlerResult } = {}) {
	const r = new PackageLoadReport();
	r.start({ pkg, options, hooks: hooksRequested });
	r.noteModules(moduleReport);
	r.noteAssets(assetReport);
	if (hookResult !== null) r.noteHooksResult(hookResult);
	if (runner) r.noteRunner(runner);
	if (arguments.length >= 1 && 'handlerResult' in arguments[0]) r.noteHandlersResult(handlerResult);
	r.finalize();
	return r;
    }
}
