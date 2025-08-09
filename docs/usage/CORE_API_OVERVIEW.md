← Back to [Usage Guide Index](index.md)

# 📚 Core API Overview

M7BootStrap exposes a small set of primary methods for loading, unloading, and managing runtime packages.
This section provides a high-level overview; for detailed usage, see the dedicated sections for each method.

---

## `constructor(netInstance)`

Creates a new bootstrapper tied to a given network instance (e.g., `m7Fetch`).

```js
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

const net = new Net();
const bootstrap = new BootStrap(net);
```

**Parameters:**

* `netInstance` — An initialized network/fetch system used for retrieving packages and assets.

---

## `async load(resources, onLoad?, onFail?, options?)`

Loads one or more packages, resolving dependencies, fetching resources, and executing mount hooks.

**Parameters:**

* `resources` — Single resource or array of packageResource inputs (string, object, inline package).
* `onLoad` *(optional)* — Handler(s) to run on success. Can be:

  * Function
  * Global function name as string
  * Symbolic reference `"@pkg.module.fn"`
  * Local bootstrapper method reference (e.g., `"#mount.load"`)
* `onFail` *(optional)* — Handler(s) to run on failure (same formats as `onLoad`).
* `options` *(optional)* — Additional config:

  * `package.hooks` (boolean) — Run `run` hooks in loaded packages (default: `true`).

**Returns:**

* `true` if all packages loaded successfully, otherwise `false`.

---

## `async unload(ids, onDone?, onFail?, options?)`

Unmounts and clears loaded packages.

**Parameters:**

* `ids` — Array of package IDs or objects with `.id`.
* `onDone` *(optional)* — Handler(s) to run after successful unload.
* `onFail` *(optional)* — Handler(s) to run if unload fails.
* `options` *(optional)*:

  * `ignoreMissing` (boolean) — Skip errors if package not found.

---

## `normalizePackageResource(resource)`

Normalizes a package resource into a consistent object:

```js
{
  label: string,   // stable identifier
  type: string,    // 'inline' | 'remote'
  stem: string,    // normalized resource string or null for inline
  repos: [         // normalized repo entries
    { url, method, postData?, fetchOpts }
  ]
}
```

Useful for comparing or tracking resources internally.

---

## `async buildDependencyGraph(resources)`

Given one or more packageResource inputs, resolves all dependencies recursively and returns a flat, ordered list of package definitions ready to be loaded.

---

## `getCache(key)` / `setCache(key, value)`

Access or store entries in the bootstrapper’s internal resource cache.

---

## `modules`

An object storing loaded modules by package ID.
Modules are available after load and cleared on unload (unless copied elsewhere).

---

## `assets`

An object storing loaded assets by package ID.
Assets are automatically mounted if HTML; other asset types are available for manual integration.

---

**Related Topics:**

* **Package & Repo Specifications** — Learn how to define resources for loading.
* **Hooks & Handlers** — See how to attach logic at various stages.
* **Unmounting Packages** — Safely remove packages and clean up assets/modules.
