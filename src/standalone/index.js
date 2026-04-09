/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */

import BootStrap from "../BootStrap.js";
import Bundler from "../bundler/Bundler.js";
import defaultLoadOpts from "../defaults/defaultLoadOpts.js";
import defaultUnloadOpts from "../defaults/defaultUnloadOpts.js";

export function createBootStrap(net, opts = {}) {
    return new BootStrap(net, opts);
}

export {
    BootStrap,
    Bundler,
    defaultLoadOpts,
    defaultUnloadOpts,
};

export default {
    BootStrap,
    Bundler,
    createBootStrap,
    defaultLoadOpts,
    defaultUnloadOpts,
};
