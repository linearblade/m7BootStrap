/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// Lightweight report object used by Repo.buildDependencyGraph()
// Focused API: startRun, noteInput, noteSkip, noteVisitStart, noteNormalizedResource,
// noteResolveFail, noteResolveSuccess, noteDependencies, noteOrdered, noteEnqueue,
// finishRun (+ finalize alias), summary(), toJSON()
// Default export: RepoResolveReport

export default class RepoResolveReport {
    constructor(opts = {}) {
	// Timing
	this.startedAt = null;
	this.finishedAt = null;
	this.durationMs = 0;

	// Run metadata
	this.options = {};
	this.input = undefined;

	// Core tracking
	this.skips = [];                   // { node, reason, key, time }
	this.visits = [];                  // { node, event:'visit_start', time }
	this.normalized = [];              // { sig, type, stem, reposCount, time }
	this.resourceSignatures = new Set();

	this.resolveFailures = [];         // { node, reason }
	this.resolveSuccesses = [];        // { id, source, repo }

	this.dependencies = new Map();     // id -> string[]
	this.edges = [];                   // { from, to }
	this.ordered = [];                 // [id...]
	this._positions = new Map();       // id -> order index (1-based per caller arg)

	this.enqueued = [];                // in the order they were queued (unique)
	this._enqueuedSet = new Set();

	this.errors = [];                  // optional external errors if ever recorded

	// Outcome
	this.success = false;              // set in finishRun/finalize
    }

    // --- lifecycle -------------------------------------------------------------

    startRun(options = {}) {
	this.startedAt = Date.now();
	this.options = { ...options };
	return this;
    }

    noteInput(input) {
	this.input = input;
	return this;
    }

    finishRun({ total } = {}) {
	this.finishedAt = Date.now();
	this.durationMs = this.finishedAt - (this.startedAt ?? this.finishedAt);

	// A run is considered successful if no explicit errors or resolveFailures were recorded
	this.success = this.errors.length === 0 && this.resolveFailures.length === 0;

	// Allow callers to stash a total output count (purely informational)
	this.total = typeof total === 'number' ? total : undefined;

	return this;
    }

    // Alias some codebases expect
    finalize(args) {
	return this.finishRun(args);
    }

    // --- notes from Repo.buildDependencyGraph() --------------------------------

    noteSkip({ node, reason = '', key = '' }) {
	this.skips.push({ node, reason, key, time: Date.now() });
	return this;
    }

    noteVisitStart(node) {
	this.visits.push({ node, event: 'visit_start', time: Date.now() });
	return this;
    }

    // Accepts "norm" but also tolerates undefined (Repo.js currently passes a var named `norm`)
    noteNormalizedResource(norm) {
	const sig = this.constructor.sigFromNormalized(norm);
	if (sig && !this.resourceSignatures.has(sig)) {
	    this.resourceSignatures.add(sig);
	    this.normalized.push({
		sig,
		type: norm?.type ?? 'unknown',
		stem: norm?.stem ?? null,
		reposCount: Array.isArray(norm?.repos) ? norm.repos.length : 0,
		time: Date.now()
	    });
	}
	return sig;
    }

    noteResolveFail({ node, reason = 'unspecified' } = {}) {
	this.resolveFailures.push({ node, reason });
	return this;
    }

    noteResolveSuccess(def = {}) {
	// keep a small, portable view; `__meta.source` is where Repo stores the fetch URL
	this.resolveSuccesses.push({
	    id: def.id ?? null,
	    source: def.__meta?.source ?? null,
	    repo: def.repo ?? null
	});
	return this;
    }

    noteDependencies(id, deps) {
	const list = Array.isArray(deps) ? deps.slice() : [];
	this.dependencies.set(id, list);
	for (const d of list) {
	    this.edges.push({ from: id, to: String(d) });
	}
	return this;
    }

    // Repo calls: noteOrdered(def.id, out.length)
    noteOrdered(id, position /* optional */) {
	if (id != null) this.ordered.push(id);
	if (id != null && typeof position === 'number') {
	    this._positions.set(id, position);
	}
	return this;
    }

    noteEnqueue(item) {
	const key = this.constructor._key(item);
	if (!this._enqueuedSet.has(key)) {
	    this._enqueuedSet.add(key);
	    this.enqueued.push(item);
	}
	return this;
    }

    // --- utilities -------------------------------------------------------------

    static sigFromNormalized(norm) {
	if (!norm || typeof norm !== 'object') return 'unknown';
	const type = norm.type ?? 'unknown';
	const stem = norm.stem ?? '';
	const repos = Array.isArray(norm.repos) ? norm.repos : [];
	const repoSig = repos
	      .map(r => `${(r?.method || 'get').toLowerCase()}:${(r?.url || '').toLowerCase()}`)
	      .join(',');
	return `${type}|${stem}|${repoSig}`;
    }

    static _key(v) {
	if (v == null) return 'null';
	if (typeof v === 'string') return `s:${v}`;
	if (typeof v === 'object') {
	    if (typeof v.id === 'string') return `id:${v.id}`;
	    if (typeof v.resource === 'string') return `res:${v.resource}`;
	    try { return `j:${JSON.stringify(v)}`; } catch { /* fall through */ }
	}
	return String(v);
    }

    // --- reporting -------------------------------------------------------------

    summary() {
	return {
	    success: this.success,
	    durationMs: this.durationMs,
	    startedAt: this.startedAt,
	    finishedAt: this.finishedAt,

	    // counts
	    enqueued: this.enqueued.length,
	    visits: this.visits.length,
	    uniqueResources: this.resourceSignatures.size,
	    resolved: this.resolveSuccesses.length,
	    resolveFailures: this.resolveFailures.length,
	    edges: this.edges.length,
	    ordered: this.ordered.length,
	    skips: this.skips.length,
	    errors: this.errors.length,

	    // optional info
	    total: this.total
	};
    }

    toJSON() {
	// A compact, stable snapshot that’s safe to log or send over the wire
	return {
	    success: this.success,
	    startedAt: this.startedAt,
	    finishedAt: this.finishedAt,
	    durationMs: this.durationMs,
	    total: this.total,

	    // inputs
	    input: this.input,
	    options: this.options,

	    // high-level results
	    uniqueResources: this.resourceSignatures.size,
	    resolved: this.resolveSuccesses.map(x => x.id).filter(Boolean),
	    failures: this.resolveFailures,
	    edges: this.edges,

	    // order & queue
	    ordered: this.ordered.slice(),
	    orderIndex: Object.fromEntries(this._positions),
	    enqueuedCount: this.enqueued.length,

	    // misc
	    skips: this.skips,
	    errors: this.errors
	};
    }
}
