/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// packages/loaders/ModuleLoadReport.js

/**
 * ModuleLoadReport
 * ----------------
 * Tracks the outcome of a module-loading pass for a single package.
 *
 * Usage:
 *   const rpt = new ModuleLoadReport(pkg.id, { limit: 8 });
 *   rpt.addLoaded("scene:chess/logic", { type: "js" }, moduleRef);
 *   rpt.addFailed("scene:chess/ai", err, { url: "/repo/..." });
 *   rpt.finalize();
 *
 * Typically returned by ModuleLoader._loadModules(...) and bubbled upward.
 */
export class ModuleLoadReport {
    /**
     * @param {string}  packageId          - Owning package id.
     * @param {object}  [opts]
     * @param {number}  [opts.limit]       - Concurrency limit (if your loader uses one).
     * @param {boolean} [opts.awaitAll]    - Parity field with Asset report (optional).
     */
    constructor(packageId, { limit = undefined, awaitAll = true } = {}) {
	this.packageId   = packageId ?? null;

	// Timing
	this.startTime   = Date.now();
	this.endTime     = null;

	// Config echoes
	this.limit       = limit;
	this.awaitAll    = !!awaitAll;

	// Per-module buckets
	// NOTE: modules usually aren't "inline", but we mirror the structure for symmetry.
	this.loaded      = [];   // [{ moduleId, meta, module }]
	this.failed      = [];   // [{ moduleId, error, meta }]

	// Aggregate counters (computed in finalize)
	this.total       = 0;
	this.loadedCount = 0;
	this.failedCount = 0;

	// Overall outcome
	this.success     = false;

	// Optional raw results (e.g., Promise.all outcome array) for postmortem/debug
	this.rawResults  = null;
    }

    /**
     * Record a successfully loaded module.
     * @param {string} moduleId
     * @param {object} [meta]
     * @param {any}    [moduleRef] - The imported module reference (ESM namespace/object).
     */
    addLoaded(moduleId, meta = {}, moduleRef = undefined) {
	const rec = { moduleId, meta };
	if (moduleRef !== undefined) rec.module = moduleRef;
	this.loaded.push(rec);
    }

    /**
     * Record a failed module load.
     * @param {string} moduleId
     * @param {Error|string} error
     * @param {object} [meta]
     */
    addFailed(moduleId, error, meta = {}) {
	this.failed.push({ moduleId, error, meta });
    }

    /**
     * Attach raw loader results if desired (e.g., from Promise.all).
     * @param {any} results
     */
    setRawResults(results) {
	this.rawResults = results;
    }

    /**
     * Compute totals and mark as complete.
     * @returns {this}
     */
    finalize() {
	this.endTime     = Date.now();
	this.loadedCount = this.loaded.length;
	this.failedCount = this.failed.length;
	this.total       = this.loadedCount + this.failedCount;
	this.success     = this.failedCount === 0;
	return this;
    }

    /**
     * Milliseconds spent (valid after finalize()).
     */
    get durationMs() {
	return this.endTime ? (this.endTime - this.startTime) : 0;
    }

    /**
     * Lightweight JSON-safe summary (omits heavy module refs).
     */
    toJSON() {
	return {
	    packageId:   this.packageId,
	    success:     this.success,
	    limit:       this.limit,
	    awaitAll:    this.awaitAll,
	    total:       this.total,
	    loadedCount: this.loadedCount,
	    failedCount: this.failedCount,
	    durationMs:  this.durationMs,
	    loaded:      this.loaded.map(({ moduleId, meta }) => ({ moduleId, meta })),
	    failed:      this.failed.map(({ moduleId, error, meta }) => ({
		moduleId,
		error: (error && error.message) ? error.message : String(error),
		meta
	    })),
	};
    }

    /**
     * Convenience constructor for tests/adapters.
     */
    static buildReport(overrides = {}) {
	const rpt = new ModuleLoadReport(overrides.packageId ?? null, {
	    limit: overrides.limit,
	    awaitAll: overrides.awaitAll
	});

	if (Array.isArray(overrides.loaded)) {
	    for (const it of overrides.loaded) {
		rpt.addLoaded(it.moduleId, it.meta, it.module);
	    }
	}
	if (Array.isArray(overrides.failed)) {
	    for (const it of overrides.failed) {
		rpt.addFailed(it.moduleId, it.error, it.meta);
	    }
	}

	if (overrides.rawResults !== undefined) {
	    rpt.setRawResults(overrides.rawResults);
	}

	return rpt.finalize();
    }
}

export default ModuleLoadReport;
