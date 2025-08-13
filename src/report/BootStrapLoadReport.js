/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// report/bootstrapLoadReport.js
// Aggregates a repo-level report plus multiple package load reports.
// Designed to pair with BootStrap.load() and friends.
//
// Fields you can rely on after finalize():
//   - success: boolean (repo.success !== false AND all packages.success)
//   - repo: <RepoLoadReport|RepoResolveReport|null>
//   - packages: PackageLoadReport[]
//   - summary(): quick counters for dashboards
//   - toJSON(): compact transport format

export default class BootStrapLoadReport {
    constructor() {
	// timing
	this.startedAt = null;
	this.finishedAt = null;
	this.durationMs = 0;

	// inputs / context
	this.requested = {
	    pkgInstructions: null,
	    mountInstructions: null,
	    options: {}
	};

	// subreports
	this.repo = null;        // RepoLoadReport | RepoResolveReport | null
	this.packages = [];      // Array<PackageLoadReport>

	// outcome
	this.success = false;
	this.errors = [];
    }

    // -------- lifecycle --------

    start({ pkgInstructions = null, mountInstructions = null, options = {} } = {}) {
	this.startedAt = Date.now();
	this.requested.pkgInstructions = pkgInstructions ?? null;
	this.requested.mountInstructions = mountInstructions ?? null;
	this.requested.options = { ...options };
	return this;
    }

    finalize() {
	this.finishedAt = Date.now();
	this.durationMs = this.finishedAt - (this.startedAt ?? this.finishedAt);

	const repoOk = this.repo ? this.repo.success !== false : true;
	const allPkgsOk = this.packages.every(r => r && r.success);
	this.success = repoOk && allPkgsOk && this.errors.length === 0;

	return this;
	return {
	    success: this.success,
	    repo: this.repo,
	    packages: this.packages
	};
    }

    // -------- noters / mutators --------

    noteRepoReport(repoReport) {
	this.repo = repoReport || null;
	return this;
    }

    addPackageReport(pkgReport) {
	if (pkgReport) this.packages.push(pkgReport);
	return this;
    }

    noteError(err) {
	this.errors.push(err instanceof Error ? err.message : err);
	return this;
    }

    // -------- views --------

    summary() {
	const total = this.packages.length;
	const ok = this.packages.filter(r => r?.success).length;
	const failed = total - ok;

	const idsOk = this.packages
	      .filter(r => r?.success)
	      .map(r => r.pkgId ?? r.lid ?? null)
	      .filter(Boolean);

	const idsFailed = this.packages
	      .filter(r => !r?.success)
	      .map(r => r.pkgId ?? r.lid ?? null)
	      .filter(Boolean);

	return {
	    success: this.success,
	    durationMs: this.durationMs,
	    repo: { present: !!this.repo, success: this.repo ? !!this.repo.success : true },
	    packages: {
		total, ok, failed,
		idsOk,
		idsFailed
	    },
	    errorCount: this.errors.length
	};
    }

    toJSON() {
	// Compact transport form
	return {
	    success: this.success,
	    repo: this.repo,
	    packages: this.packages
	};
    }

    // Optional convenience: quick builder
    static build({ pkgInstructions, mountInstructions, options, repoReport, packageReports = [], errors = [] } = {}) {
	const report = new BootStrapLoadReport();
	report.start({ pkgInstructions, mountInstructions, options });
	if (repoReport) report.noteRepoReport(repoReport);
	for (const p of packageReports) report.addPackageReport(p);
	for (const e of errors) report.noteError(e);
	report.finalize();
	return report;
    }
}
