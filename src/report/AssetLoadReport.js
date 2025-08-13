/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// packages/loaders/AssetLoadReport.js

/**
 * AssetLoadReport
 * ----------------
 * Tracks the outcome of an asset-loading pass for a single package.
 *
 * Usage:
 *   const report = new AssetLoadReport(pkg.id, { awaitAll: true });
 *   report.addInline("scene:chess/style", { type: "css" });
 *   report.addLoaded("scene:chess/board", { type: "html" }, resp);
 *   report.addFailed("scene:chess/sound", err, { url: "/repo/..." });
 *   report.finalize();
 *
 * Returned by AssetLoader._loadAssets(...), and can be bubbled up by callers.
 */
export class AssetLoadReport {
  /**
   * @param {string}  packageId       - Owning package id.
   * @param {object}  [opts]
   * @param {boolean} [opts.awaitAll] - Whether the batch was run with awaitAll.
   * @param {number}  [opts.limit]    - Concurrency limit (if relevant to caller).
   */
  constructor(packageId, { awaitAll = true, limit = undefined } = {}) {
    this.packageId   = packageId ?? null;

    // Timing
    this.startTime   = Date.now();
    this.endTime     = null;

    // Config echoes (useful in handlers)
    this.awaitAll    = !!awaitAll;
    this.limit       = limit;

    // Per-asset buckets
    this.inline      = [];   // [{ assetId, meta }]
    this.loaded      = [];   // [{ assetId, meta, response? }]
    this.failed      = [];   // [{ assetId, error, meta? }]

    // Aggregate counters (filled during finalize)
    this.total       = 0;
    this.loadedCount = 0;
    this.failedCount = 0;
    this.inlineCount = 0;

    // Overall outcome
    this.success     = false;

    // Optional raw batch results if caller wants to stash them
    // (e.g., the object returned by net.batch.run(...).results)
    this.batchResults = null;
  }

  /**
   * Record an inline asset (stored immediately without network).
   * @param {string} assetId
   * @param {object} [meta]
   */
  addInline(assetId, meta = {}) {
    this.inline.push({ assetId, meta });
  }

  /**
   * Record a successfully loaded remote asset.
   * @param {string} assetId
   * @param {object} [meta]
   * @param {any}    [response] - Optional transport-level response (e.g., m7Fetch full body)
   */
  addLoaded(assetId, meta = {}, response = undefined) {
    const rec = { assetId, meta };
    if (response !== undefined) rec.response = response;
    this.loaded.push(rec);
  }

  /**
   * Record a failed remote asset.
   * @param {string} assetId
   * @param {Error|string} error
   * @param {object} [meta]
   */
  addFailed(assetId, error, meta = {}) {
    this.failed.push({ assetId, error, meta });
  }

  /**
   * Optional: attach raw batch results for later inspection.
   * @param {object} batchResults - Whatever your batch runner returned per id.
   */
  setBatchResults(batchResults) {
    this.batchResults = batchResults;
  }

  /**
   * Compute totals and mark the report complete.
   * @returns {this}
   */
  finalize() {
    this.endTime     = Date.now();
    this.inlineCount = this.inline.length;
    this.loadedCount = this.loaded.length;
    this.failedCount = this.failed.length;
    this.total       = this.inlineCount + this.loadedCount + this.failedCount;
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
   * Lightweight JSON-friendly summary (omit heavy payloads like response).
   */
  toJSON() {
    return {
      packageId:   this.packageId,
      success:     this.success,
      awaitAll:    this.awaitAll,
      limit:       this.limit,
      total:       this.total,
      loadedCount: this.loadedCount,
      failedCount: this.failedCount,
      inlineCount: this.inlineCount,
      durationMs:  this.durationMs,
      inline:      this.inline.slice(),
      loaded:      this.loaded.map(({ assetId, meta }) => ({ assetId, meta })),
      failed:      this.failed.map(({ assetId, error, meta }) => ({
        assetId,
        error: (error && error.message) ? error.message : String(error),
        meta
      })),
    };
  }

  /**
   * Convenience: build a report from simple counters/lists if needed.
   * Mostly for tests or adapter shims.
   */
  static buildReport(overrides = {}) {
    const rpt = new AssetLoadReport(overrides.packageId ?? null, {
      awaitAll: overrides.awaitAll,
      limit: overrides.limit
    });
    if (Array.isArray(overrides.inline)) {
      for (const it of overrides.inline) rpt.addInline(it.assetId, it.meta);
    }
    if (Array.isArray(overrides.loaded)) {
      for (const it of overrides.loaded) rpt.addLoaded(it.assetId, it.meta, it.response);
    }
    if (Array.isArray(overrides.failed)) {
      for (const it of overrides.failed) rpt.addFailed(it.assetId, it.error, it.meta);
    }
    return rpt.finalize();
  }
}

export default AssetLoadReport;
