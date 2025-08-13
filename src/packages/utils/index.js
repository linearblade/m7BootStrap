/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/**
 * Generate a standardized scoped key for a package asset/module.
 *
 * @param {string} pkgId - The package ID (e.g., "scene:chess")
 * @param {string} id - The local asset/module ID within the package (e.g., "board")
 * @returns {string} Scoped key in the format "<pkgId>/<id>"
 */
function scopedKey(pkgId, id) {
    if (typeof pkgId !== 'string' || !pkgId.trim()) {
        throw new Error("scopedKey: pkgId must be a non-empty string");
    }
    if (typeof id !== 'string' || !id.trim()) {
        throw new Error("scopedKey: id must be a non-empty string");
    }
    return `${pkgId}/${id}`;
}


export default {
    scopedKey
};
