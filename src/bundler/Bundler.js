/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */

export class Bundler {
    constructor(bootstrap, opts = {}) {
        if (!bootstrap) {
            throw new Error("Bundler requires a valid bootstrap instance.");
        }
        this.bootstrap = bootstrap;
        this.net = bootstrap.net;
        this.opts = opts;
    }

    async request(url, packageList, opts = {}) {
        const targetUrl = typeof url === 'string' && url.trim() ? url.trim() : '';

        if (!targetUrl) {
            throw new Error("Bundler.request() requires a valid url.");
        }

        const isHash = value => (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value)
        );

        if (!isHash(opts)) {
            opts = { version: opts };
        }

        const packages = Array.isArray(packageList)
            ? packageList
            : packageList == null
                ? []
                : [packageList];

        const {
            fetchOpts: optFetchOpts = {},
            body: _body,
            method: _method,
            postData: _postData,
            url: _url,
            ...requestOpts
        } = opts;

        const payload = {
            ...requestOpts,
            version: requestOpts.version ?? this.opts?.version ?? 1,
            packages,
        };

        const fetchOpts = {
            ...(this.opts?.fetchOpts || {}),
            ...(optFetchOpts || {}),
            format: 'full',
        };
        const resp = await this.net.http.post(targetUrl, payload, fetchOpts);

        if (!resp || !resp.ok) {
            throw new Error(`Failed to load bundle from ${targetUrl}: ${resp?.status || '??'} ${resp?.statusText || 'Unknown error'}`);
        }

        return resp.body ?? resp;
    }

    // Orchestrates the bundle fetch + decode path.
    async load(url, packageList, opts = {}) {
        const requestResult = await this.request(url, packageList, opts);
        return this.decode(requestResult);
    }

    decode(packageList) {
        const envelope = this._normalizeEnvelope(packageList);
        const packages = envelope.packages.map((pkg, index) => this._decodeBundlePackage(pkg, index, envelope));

        return {
            version: envelope.version,
            compression: envelope.compression,
            meta: {
                ...envelope.meta,
                count: typeof envelope.meta?.count === 'number'
                    ? envelope.meta.count
                    : packages.length,
            },
            packages,
        };
    }

    _decodeBundlePackage(pkg, index, envelope) {
        if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
            throw new Error(`Bundler.decode() expected package record ${index} to be an object.`);
        }

        const recordMeta = pkg.meta && typeof pkg.meta === 'object' && !Array.isArray(pkg.meta)
            ? { ...pkg.meta }
            : {};
        const packageBlock = pkg.package && typeof pkg.package === 'object' && !Array.isArray(pkg.package)
            ? { ...pkg.package }
            : {};
        const manifest = this._parseManifest(packageBlock.data, `packages[${index}].package.data`);
        const source = typeof packageBlock.url === 'string' ? packageBlock.url.trim() : '';
        const base = this._resolveBasePath(recordMeta.base, source, envelope.meta?.base);
        const enrichedManifest = {
            ...manifest,
            ...(typeof manifest.lid === 'string' || typeof manifest.lid === 'number'
                ? { lid: manifest.lid }
                : manifest.id != null
                    ? { lid: manifest.id }
                    : {}),
            __meta: {
                ...(manifest.__meta && typeof manifest.__meta === 'object' ? manifest.__meta : {}),
                source,
                base,
            },
        };

        const assets = this._mergeEntries(
            enrichedManifest.assets,
            pkg.assets,
            `packages[${index}].assets`
        );
        const modules = this._mergeEntries(
            enrichedManifest.modules,
            pkg.modules,
            `packages[${index}].modules`
        );

        return {
            ...enrichedManifest,
            meta: recordMeta,
            package: {
                ...packageBlock,
                data: enrichedManifest,
            },
            assets,
            modules,
        };
    }

    _unwrapResponse(payload) {
        if (
            payload &&
            typeof payload === 'object' &&
            !Array.isArray(payload) &&
            'body' in payload &&
            !('packages' in payload) &&
            !('version' in payload)
        ) {
            return payload.body;
        }

        return payload;
    }

    _normalizeEnvelope(packageList) {
        let payload = this._unwrapResponse(packageList);

        if (typeof payload === 'string') {
            const text = payload.trim();
            if (!text) {
                throw new Error('Bundler.decode() requires a non-empty bundle payload.');
            }

            try {
                payload = JSON.parse(text);
            } catch (err) {
                throw new Error(`Bundler.decode() received invalid JSON: ${err.message}`);
            }
        }

        if (Array.isArray(payload)) {
            return {
                version: 1,
                compression: 'none',
                meta: {
                    count: payload.length,
                },
                packages: payload,
            };
        }

        if (!payload || typeof payload !== 'object') {
            throw new Error('Bundler.decode() requires a bundle envelope, response body, or package array.');
        }

        const version = payload.version ?? 1;
        if (version !== 1) {
            throw new Error(`Bundler.decode() only supports bundle version 1, received ${version}.`);
        }

        const compression = payload.compression ?? 'none';
        if (compression !== 'none') {
            throw new Error(`Bundler.decode() only supports compression "none", received "${compression}".`);
        }

        const packages = Array.isArray(payload.packages) ? payload.packages : [];
        const meta = payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
            ? { ...payload.meta }
            : {};

        return {
            version,
            compression,
            meta,
            packages,
        };
    }

    _parseManifest(value, context) {
        if (typeof value === 'string') {
            const text = value.trim();
            if (!text) {
                throw new Error(`Bundler.decode() found an empty manifest payload at ${context}.`);
            }

            try {
                value = JSON.parse(text);
            } catch (err) {
                throw new Error(`Bundler.decode() failed to parse manifest at ${context}: ${err.message}`);
            }
        }

        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`Bundler.decode() expected a JSON object manifest at ${context}.`);
        }

        return value;
    }

    _entryId(entry, context) {
        if (typeof entry === 'string') {
            const id = entry.trim();
            if (!id) {
                throw new Error(`Bundler.decode() found an empty entry id at ${context}.`);
            }
            return id;
        }

        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new Error(`Bundler.decode() expected an object entry at ${context}.`);
        }

        const id = typeof entry.id === 'string' ? entry.id.trim() : '';
        if (!id) {
            throw new Error(`Bundler.decode() expected entry id at ${context}.`);
        }

        return id;
    }

    _indexEntries(entries, context) {
        const map = new Map();
        if (!Array.isArray(entries)) {
            return map;
        }

        for (const entry of entries) {
            const id = this._entryId(entry, context);
            map.set(id, entry);
        }

        return map;
    }

    _mergeEntries(manifestEntries, bundleEntries, context) {
        const manifestList = Array.isArray(manifestEntries) ? manifestEntries : [];
        const bundleList = Array.isArray(bundleEntries) ? bundleEntries : [];
        const bundleMap = this._indexEntries(bundleList, context);
        const merged = [];
        const seen = new Set();

        for (const entry of manifestList) {
            const id = this._entryId(entry, context);
            const bundled = bundleMap.get(id);
            const manifestEntry = typeof entry === 'string'
                ? { id: entry }
                : entry;

            if (bundled && typeof bundled === 'object' && !Array.isArray(bundled)) {
                merged.push({
                    ...manifestEntry,
                    ...bundled,
                    data: bundled.data ?? manifestEntry.data,
                });
                seen.add(id);
                continue;
            }

            merged.push({
                ...manifestEntry,
            });
            seen.add(id);
        }

        for (const entry of bundleList) {
            const id = this._entryId(entry, context);
            const bundleEntry = typeof entry === 'string'
                ? { id: entry }
                : entry;
            if (seen.has(id)) {
                continue;
            }

            merged.push({
                ...bundleEntry,
            });
            seen.add(id);
        }

        return merged;
    }

    _resolveBasePath(recordBase, sourceUrl, envelopeBase) {
        const base = [recordBase, envelopeBase]
            .find(value => typeof value === 'string' && value.trim());

        if (typeof base === 'string' && base.trim()) {
            return base.trim();
        }

        if (typeof sourceUrl === 'string' && sourceUrl.trim()) {
            return sourceUrl.trim().replace(/[^/]+$/, '');
        }

        return '';
    }
}

export default Bundler;
