/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
// small stable helpers
function stableStringify(obj) {
  if (obj == null) return '';
  if (typeof obj !== 'object') return String(obj);
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function hash32(str) {
  let h = 2166136261 >>> 0; // FNV-1a-ish
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function normalizeRepoItem(r) {
  if (typeof r === 'string') {
    const s = r.trim().replace(/\/+$/, '');
    return { url: s };
  }
  const out = { ...(r || {}) };
  if (out.url) out.url = String(out.url).trim().replace(/\/+$/, '');
  return out;
}

function repoFingerprint(repoList, method, postData, fetchOpts) {
  const list = (Array.isArray(repoList) ? repoList : []).map(normalizeRepoItem);
  const payload = {
    repos: list,
    method: method ? String(method).toLowerCase() : undefined,
    postData: postData ?? undefined,
    fetchOpts: fetchOpts ?? undefined,
  };
  return hash32(stableStringify(payload));
}

function looksLikeSymbolicId(s) {
  // e.g., "scene:chess" or "engine:square"
  return /^[a-z0-9_.-]+:[a-z0-9_.-]+$/i.test(s);
}

_makeCacheKey2(v) {
  if (!v) return null;

  // Raw string reference
  if (typeof v === 'string') {
    const s = v.trim();
    // If it looks symbolic (id:name), lowercase for consistency; else keep as-is (URLs/paths can be case-sensitive)
    return looksLikeSymbolicId(s) ? s.toLowerCase() : s;
  }

  // Inline package via { resource: { ... } }
  if (v.resource && typeof v.resource === 'object') {
    const inline = v.resource;
    if (inline.id) return String(inline.id).trim().toLowerCase();
    // No id → hash content for a stable key
    return `inline:${hash32(stableStringify(inline))}`;
  }

  // Normal case: { resource: "id-or-path", repo?, method?, postData?, fetchOpts? }
  if (v.resource && typeof v.resource === 'string') {
    const resRaw = v.resource.trim();
    const resKey = looksLikeSymbolicId(resRaw) ? resRaw.toLowerCase() : resRaw;

    if (v.repo && v.repo.length) {
      const fp = repoFingerprint(v.repo, v.method, v.postData, v.fetchOpts);
      return `${resKey}::${fp}`;
    }
    return resKey;
  }

  // Direct inline package object with { id: ... }
  if (v.id) return String(v.id).trim().toLowerCase();

  // Last resort: hash the structure
  return `anon:${hash32(stableStringify(v))}`;
}
