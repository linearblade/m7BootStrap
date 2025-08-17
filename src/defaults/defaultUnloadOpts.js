/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
function unloadError(...args) {  console.error('there was an error unloading...',args); }

export default {
    hooks:undefined,
    load: '#runners.unmount',
    error: unloadError
};
