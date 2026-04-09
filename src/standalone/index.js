/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */

import BootStrap from "../BootStrap.js";
import Bundler from "../bundler/Bundler.js";
import defaultLoadOpts from "../defaults/defaultLoadOpts.js";
import defaultUnloadOpts from "../defaults/defaultUnloadOpts.js";
import Net from "../../../m7Fetch/src/index.js";

export function createBootStrap(netOpts = {}, bootstrapOpts = {}) {
    const runtimeNet = new Net(netOpts);
    const bootstrap = new BootStrap(runtimeNet, bootstrapOpts);
    return { net: runtimeNet, bootstrap };
}

export {
    BootStrap,
    Bundler,
    Net,
    defaultLoadOpts,
    defaultUnloadOpts,
};

export default {
    BootStrap,
    Bundler,
    Net,
    createBootStrap,
    defaultLoadOpts,
    defaultUnloadOpts,
};
