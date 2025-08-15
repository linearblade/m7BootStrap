

# --- begin: docs/AI_DISCLOSURE.md ---

# ⚙️ AI Disclosure Statement

This project incorporates the assistance of artificial intelligence tools in a supporting role to accelerate development and reduce repetitive labor.

Specifically, AI was used to:

* 🛠️ **Accelerate the creation of repetitive or boilerplate files**, such as configuration definitions and lookup logic.
* ✍️ **Improve documentation clarity**, formatting, and flow for both technical and general audiences.
* 🧠 **Act as a second set of eyes** for small but crucial errors — such as pointer handling, memory safety, and edge-case checks.
* 🌈 **Suggest enhancements** like emoji-infused logging to improve readability and human-friendly debug output.

---

## 🧑‍💻 Emoji Philosophy

I **like emoji**. They're easy for me to scan and read while debugging. Emoji make logs more human-friendly and give structure to otherwise noisy output.

Future versions may include a **configurable emoji-less mode** for those who prefer minimalism or need plaintext compatibility.

And hey — if you don't like them, the wonders of open source mean you're free to **delete them all**. 😄

---

## 🔧 Human-Directed Engineering

All core architecture, flow design, function strategy, and overall system engineering are **authored and owned by the developer**. AI was not used to generate the software's original design, security model, or protocol logic.

Every AI-assisted suggestion was critically reviewed, tested, and integrated under human judgment.

---

## 🤝 Philosophy

AI tools were used in the same spirit as modern compilers, linters, or search engines — as **assistants, not authors**. All decisions, final code, and system behavior remain the responsibility and intellectual output of the developer.


# --- end: docs/AI_DISCLOSURE.md ---



# --- begin: docs/usage.md ---

## 📦 Usage

> Requires **m7Fetch** for HTTP/module loading.  
> Repo: https://github.com/linearblade/m7fetch

### 1) Initialize
```js
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

const net = new Net();
const bootstrap = new BootStrap(net);
```

### 2) Load one or more packages
```js
// Options (all optional)
const opts = {
  package: { hooks: true }, // run each package's `run` hooks (default: true)
};

// Handlers can be:
// - a function
// - a global string "myFunc"
// - a symbolic module ref "@pkg.module.fn"
// - a local method "#runner.mount" (bound to `bootstrap`)
const onLoad  = ["#runner.mount", (sys, ctx) => console.log("Loaded:", ctx.results)];
const onError = ["jobFail",       (sys, ctx) => console.warn("Failed:", ctx.failed, ctx.err)];

// Resource list can be:
// - symbolic: "scene:chess"
// - repo-wrapped: { resource: "scene:chess", repo: ["/repo"] }
// - inline package: { resource: { id: "...", assets: [...], modules: [...] } }
const resources = [
  { resource: "scene:chess", repo: ["/repo"] },
  "@resources.allpurposemounter" // resolved by your menu system if you use one
];

// Load all (dependencies are resolved automatically)
const ok = await bootstrap.load(resources, onLoad, onError, opts);
if (!ok) {
  console.error("Boot failed");
}
```

### 3) Unload later (optional)
```js
// Unload by package id (keeps assets/modules if desired)
await bootstrap.unload(
  ["scene:chess"],                 // ids or objects with `.id`
  ["#runner.unmount"],               // onDone handlers
  ["jobFail"],                     // onError handlers
  { ignoreMissing: true }          // options
);
```

### Notes
- Packages can declare assets, modules, dependencies, and run hooks.
- The bootstrapper resolves a dependency graph first, then loads in a safe order.
- Asset/meta registries and module references are tracked for you.
- Mounting is pluggable: ship a mount package or use #runner.mount to apply DOM injections.


# --- end: docs/usage.md ---



# --- begin: docs/usage/ACCESSING_DATA.md ---

# 📂 Accessing Data

All retrieved data in **m7BootStrap** can be accessed via:

```js
bootstrap.data
// or
bootstrap.packages.data
```

Both properties are **aliases** that point to the same `PackageData` instance — the central in-memory registry for all loaded packages, assets, and modules.

You can either:

* Access the underlying `Map` objects directly via class properties
* Or use the convenience methods documented below for filtered and structured lookups

---

## Direct Properties

The following `Map` registries are available on `bootstrap.data`:

| Property      | Key Type | Value Type  | Description                            |
| ------------- | -------- | ----------- | -------------------------------------- |
| `packages`    | `string` | `object`    | Loaded package metadata by internal ID |
| `assets`      | `string` | `any`       | Loaded asset content by internal ID    |
| `assetsMeta`  | `string` | `EntryMeta` | Asset metadata records                 |
| `modules`     | `string` | `any`       | Loaded JS module references            |
| `modulesMeta` | `string` | `EntryMeta` | Module metadata records                |

---

## Convenience Methods

### 📦 Package-Level

```js
data.listPackages(filter?)
```

Returns an array of package IDs, optionally filtered.

**Example:**

```js
data.listPackages(meta => meta.loaded);
```

```js
data.getPackages(filter?)
```

Returns all packages as `{ id: PackageEntry }` objects, with assets and modules included.

**Example:**

```js
const pkgs = data.getPackages({ type: "scene" });
```

```js
data.getPackage(id)
```

Returns a single `PackageEntry` by package ID.

**Example:**

```js
const uiPkg = data.getPackage("ui-kit");
```

```js
data.package_isLoaded(id)
```

Boolean: checks if a package is loaded.

**Example:**

```js
if (!data.package_isLoaded("ui-kit")) {
  console.log("Package not yet loaded");
}
```

```js
data.package_setLoaded(id)
```

Marks a package's `meta.loaded = true`.

**Example:**

```js
data.package_setLoaded("ui-kit");
```

---

### 🖼 Assets

```js
data.getAssets(filter?)
```

Returns all assets, optionally filtered by predicate or partial object.

**Example:**

```js
const textures = data.getAssets(meta => meta.type === "texture");
```

```js
data.getAsset(id)
```

Returns a single `AssetEntry` by internal asset ID.

**Example:**

```js
const logo = data.getAsset("pkg1:logo.png");
```

```js
data.getPackageAssets(pkgId, filter?)
```

Returns all assets loaded by a specific package, optionally filtered.

**Example:**

```js
const pkgTextures = data.getPackageAssets("pkg1", { type: "texture" });
```

```js
data.getPackageAsset(pkgId, originalId)
```

Looks up an asset by its **original (un-prefixed)** ID within a package.

**Example:**

```js
const logo = data.getPackageAsset("pkg1", "logo.png");
```

---

### 📜 Modules

```js
data.getModules(filter?)
```

Returns all modules, optionally filtered.

**Example:**

```js
const uiModules = data.getModules(meta => meta.category === "ui");
```

```js
data.getModule(id)
```

Returns a single `ModuleEntry` by internal module ID.

**Example:**

```js
const renderer = data.getModule("pkg1:renderer");
```

```js
data.getPackageModules(pkgId, filter?)
```

Returns all modules loaded by a specific package, optionally filtered.

**Example:**

```js
const mathModules = data.getPackageModules("pkg1", { category: "math" });
```

```js
data.getPackageModule(pkgId, originalId)
```

Looks up a module by its **original (un-prefixed)** ID within a package.

**Example:**

```js
const initFn = data.getPackageModule("pkg1", "init");
```

---

## Filtering

Any method with a `filter` parameter accepts:

* A predicate function `(meta, id) => boolean`
* A shallow partial object `{ key: value, ... }`
* `null` / `undefined` to match all entries

Filtering always matches against the `meta` object.


# --- end: docs/usage/ACCESSING_DATA.md ---



# --- begin: docs/usage/ADVANCED_USAGE.md ---

← Back to [Usage Guide Index](TOC.md)

# 🚀 Advanced Usage

This section covers techniques for customizing **M7BootStrap** beyond the basics — from parallelizing loads to integrating with external systems.

---

## 1. Parallel Package Loading

**M7BootStrap** automatically resolves dependencies before loading, but package loading itself can be parallelized for speed.

```js
import { createLimiter } from "./<path to bootstrap>/utils/limiter.js";

const limit = createLimiter(8); // 8 concurrent loads

await Promise.all(
  resources.map(res => limit(() => bootstrap.load([res])))
);
```
bootstrap.load ALSO provides for built in concurrency limiting
```
bootstrap.load(resources,{load,error, limit:8})
```

> **Tip:** Parallelization is especially useful for large asset bundles where dependency order is not critical.

---

## 2. Custom Repository Resolvers

By default, package resolution uses **m7Fetch** for HTTP/module loading. this can be highly customized.

However, you can override `.repo.resolve()` to handle or buildDependencyGraph if more customization is required than it provides:

* Authentication
* Caching
* Custom URL rewriting
* Loading from non-HTTP sources (e.g., local filesystem, IndexedDB)

**Example:**

```js
bootstrap.repo.resolve = async function (pkgResource) {
  if (pkgResource.repo && pkgResource.repo[0].url.startsWith("local:")) {
    return await loadFromLocalDB(pkgResource);
  }
  return await m7FetchResolve(pkgResource);
};
```

---

## 3. Inline Package Definitions

You can define complete packages inline — no external request needed.

```js
const inlinePackage = {
  resource: {
    id: "allpurposemounter",
    assets: [{ id: "mountdoc", inline: true, content: { foo: "bar" } }],
    modules: [],
    run: ["mountusMaximus"]
  }
};

await bootstrap.load([inlinePackage]);
```

---

## 4. Mixing Symbolic & Repo-Wrapped Resources

`resources` arrays can mix formats freely:

```js
const resources = [
  "scene/chess.json",                               //straight url ref
  "scene:chess",                                    // symbolic, same as above but shorthand
  { resource: "scene:checkers", repo: ["/repo"] },  // repo-wrapped
  inlinePackage                                      // inline
];

await bootstrap.load(resources);
```

---

## 5. Using Post-Load Hooks for Integration

Since parallel loading may not respect dependency order, you can integrate all packages after loading:
note: ctx format is subject to change refer to  [Hooks & Handlers](HOOKS_AND_HANDLERS.md) for the current specification for your version
```js
const onLoad = [
  "#runner.mount",
  (sys, ctx) => {

    ctx.results.forEach(pkg => {
      if (pkg.modules.gameLogic) {
        attachToGame(pkg.modules.gameLogic);
      }
    });
  }
];

await bootstrap.load(resources, {load:onLoad});
```

---

## 6. Loading Without Hooks

If you want full manual control:

```js
const results = await bootstrap.load(resources,  {
  package: { hooks: false }
});
```

---

## 7. External Integration Example

Integrate **M7BootStrap** into a three.js scene loader:

```js
const onLoad = [
  (sys, ctx) => {
    ctx.results.forEach(pkg => {
      if (pkg.assets.model) {
        const model = loadGLTF(pkg.assets.model.url);
        scene.add(model);
      }
    });
  }
];

await bootstrap.load(["scene:3dworld"], {load:onLoad});
```

---

**Related Topics:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**


# --- end: docs/usage/ADVANCED_USAGE.md ---



# --- begin: docs/usage/BASIC_CONCEPTS.md ---

← Back to [Usage Guide Index](TOC.md)

# 🧩 Basic Concepts

Before diving into code, it’s important to understand the **core building blocks** of M7BootStrap and how they work together.

---

## 1. Packages

A **package** is the fundamental unit that M7BootStrap loads, mounts, and optionally unmounts.  
A package may contain:

- **Assets** — files, HTML templates, data blobs, images, etc.
- **Modules** — JavaScript modules, scripts, or logic.
- **Metadata** — descriptive info (id, title, etc.).
- **Dependencies** — other packages that must also be loaded.
- **Run hooks** — functions to run immediately after loading.

Packages are defined using the **packageResource** format (see [Package Specifications](PACKAGE_SPECIFICATIONS.md) for details).

---

## 2. packageResource

The **packageResource** describes where and how a package is obtained.  
It can take several forms:

- **String** — a direct URL or symbolic reference (e.g., `"scene:chess"`, or `scene/chess.json`).
- **Object** — includes a `resource` key and optional `repo` key(s).
- **Inline package object** — contains the package’s entire definition in-place (no network fetch required).

---

## 3. Repositories (Repos, or Repo Resource)

A **repo** tells M7BootStrap *where* to fetch packages from.

- **String repo** — represents a base URL.
- **Object repo** — contains URL plus method, POST data, and fetch options.
- **Array of repos** — multiple sources; tried in order until one succeeds.

---

## 4. The Boot Process

When you call `bootstrap.load(...)`, M7BootStrap:

1. **Builds a dependency graph** from the provided packages.
2. **Fetches all packages in parallel** for speed (dependencies are not loaded in strict order).
3. **Loads assets** into internal registries.
4. **Loads modules** into the bootstrapper’s module store.
5. **Runs hooks** (if enabled).
6. **Invokes your onLoad/onError handlers, including builtin mount/unmount handling, if invoked**.

---

## 5. Mounting and Unmounting

- **Mounting** — Integrating package content (HTML, scripts, styles, etc.) into your application or runtime environment.
- **Unmounting** — Removing package content and clearing modules from M7BootStrap’s registries.
  - If you copied modules elsewhere, you must remove them manually.

---

## 6. Hooks & Handlers

Hooks let packages perform tasks automatically after load/unload.  
Handlers let *you* react to load/unload events with your own code.

- **onLoad** — Runs after a package (or all packages) has loaded.
- **onError** — Runs if a package fails to load.

Handlers can be:
- A direct function.
- A string name (global or symbolic).
- A bound method reference (`"#runner.mount"`, "~module.start", "@pkg:module.start","something_in_global_namespace").


---

## 7. Why Parallel Loading?

Parallel loading maximizes performance, especially when packages include large assets or multiple dependencies.  
Since dependencies are resolved *after* everything loads, you have full control over how and when to integrate them.

---

## Next Steps

Continue to [Quick Start](QUICK_START.md) to see M7BootStrap in action with a minimal example.

# --- end: docs/usage/BASIC_CONCEPTS.md ---



# --- begin: docs/usage/CORE_API_OVERVIEW.md ---

← Back to [Usage Guide Index](TOC.md)

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

## `async load(resources, options?)`

See **[Loading Packages](LOADING_PACKAGES.md)** for information on loading packages.

Loads one or more packages, resolving dependencies, fetching resources, and executing mount hooks.

**Parameters:**

* `resources` — Single resource or array of packageResource inputs (string, object, inline package).
* `options` *(optional)* — include load , error to run handlers.
  * load, error (optional)* — Handler(s) to run on success or failure. Can be:
    * Function
    * Global function name as string
    * Symbolic reference `"@pkg.module.fn"`
    * Local bootstrapper method reference (e.g., `"#runner.mount"`)
  * `package.hooks` (boolean) — Run `run` hooks in loaded packages (default: `true`).

**Returns:**

* `BootStrapLoadReport` - report.success
  * if all packages loaded successfully, true
  * if any packages failed , false

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

## `bootstrap.mount.load(pkgID,options?)`

Mounts a given package. if that package is already loaded, it will not be reloaded.
use options.force to force mount a package that is already loaded.

---
## `bootstrap.mount.unload(pkgID,options?)`

Unounts a given package 

---

## `async buildDependencyGraph(resources)`

Given one or more packageResource inputs, resolves all dependencies recursively and returns a flat, ordered list of package definitions ready to be loaded.
This is mainly useful to testing, otherwise there is no need to build a dependency graph on your own.

---


## `data`

All loaded data is stored within the PackageData Object. this may be accessed via a variety of methods , or directly.

---


**Related Topics:**

* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)** — Learn how to define resources for loading.
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)** — See how to attach logic at various stages.
* **[Mounting & Unmounting Packages](MOUNTING.md)** — Safely remove packages and clean up assets/modules.
* Continue to **[Loading Packages](LOADING_PACKAGES.md)** for information on loading packages.

# --- end: docs/usage/CORE_API_OVERVIEW.md ---



# --- begin: docs/usage/EXAMPLES_LIBRARY.md ---

← Back to [Usage Guide Index](TOC.md)

# 📚 Examples Library

This section contains ready-to-use examples for common **M7BootStrap** usage patterns.
Each example is self-contained and demonstrates a specific concept or feature.

---

## 1. Basic Package Load

```js
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

const net = new Net();
const bootstrap = new BootStrap(net);

const resources = [
  { resource: "scene:chess", repo: ["/repo"] }
];

const success = await bootstrap.load(
  resources,
  {
    load:  (sys, ctx) => console.log("Loaded:", ctx),
    error:  (sys, ctx) => console.error("Error:", ctx)
  }
);

if (!success) {
  console.warn("One or more packages failed to load.");
}
```

---

## 2. Loading with Inline Package

```js
const inlinePkg = {
  resource: {
    id: "allpurposemounter",
    title: "General Purpose Mounting Tool",
    assets: [
      { id: "mountinstructions", inline: true, content: { a: "b", nums: [1, 2, 3] } }
    ],
    modules: [],
    run: ["mountusMaximus"]
  }
};

await bootstrap.load([inlinePkg], {load, error});
```

---

## 3. Custom Post-Load Handling

```js
const onLoad = [
  "#runner.mount", // built-in DOM/asset mount
  (sys, ctx) => {
    console.log("All packages loaded. Moving modules to final location.");
    moveModules(sys.modules);
  }
];

const onError = [
  (sys, ctx) => console.error(`Failed to load:`  ctx)
];

await bootstrap.load(resources, {load:onLoad, error:onError});
```

---

## 4. Unloading Packages

```js
await bootstrap.unload(
  ["scene:chess"],
  ["#runner.unmount", cleanupModules],
  ["jobFail"],
  { ignoreMissing: true }
);
```

---

## 5. Parallel Loading of Multiple Packages

```js
const resources = [
  { resource: "scene:chess", repo: ["/repo"] },
  { resource: "utils:hamsters", repo: ["/repo"] }
];

await bootstrap.load(resources, {load:onLoad, error:onError});
```

---

## 6. Using Symbolic Resource Names

```js
const resources = [
  "@resources.chessScene",
  "@resources.hamsterUtils"
];

await bootstrap.load(resources, {load:"#runner.mount", error:"globally_scoped_function"});
```

---

## 7. Mixed Package Types

```js
const resources = [
  "scene:chess",                               // plain symbolic
  { resource: "utils:hamsters", repo: ["/r"] }, // with repo
  { resource: inlinePkg }                       // inline
];

await bootstrap.load(resources, {load:onLoad, error:onError});
```

---

## 8. Debugging Dependency Graph

```js
const graph = await bootstrap.repo.buildDependencyGraph(resources);
console.log("Dependency Graph:", graph);
```

---

**See Also:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* **[Troubleshooting](TROUBLESHOOTING.md)**


# --- end: docs/usage/EXAMPLES_LIBRARY.md ---



# --- begin: docs/usage/GLOSSARY.md ---

← Back to [Usage Guide Index](TOC.md)

# 📖 Glossary

A reference for key terms and concepts used in **M7BootStrap** and related systems.

---

## **Asset**

Any resource declared by a package that can be loaded into the bootstrapper and optionally mounted into the runtime environment.

Assets can be non-code (e.g., images, audio, JSON data, stylesheets) or code-based (e.g., JavaScript files, modules, CSS).
These are generally inline objects or external resources intended to be injected into the DOM tree.

---

## **Bootstrapper**

The central `BootStrap` instance responsible for loading packages, tracking assets/modules, and managing lifecycle events (mount, unmount, etc.).

---

## **Dependency Graph**

A resolved list of packages (and their dependencies) that must be loaded before runtime execution.
Built by `repo.buildDependencyGraph()` before actual loading begins.

---

## **Handler**

A function or reference string that is executed when a specific lifecycle event occurs.
Handlers can be:

* A function reference
* A global function name (`"myFunc"`)
* A symbolic module ref (`"@pkg.module.fn"`)
* A local bootstrapper-bound method (`"#runner.mount"`)

---

## **Hooks**

Built-in lifecycle events (`onLoad`, `onError`, etc.) that you can attach handlers to for custom behavior.

---

## **Inline Package**

A package whose definition is included directly in JavaScript as an object (rather than being fetched from a repo).
**Example:**

```js
{ resource: { id: "pkg1", assets: [...], modules: [...] } }
```

---

## **Load**

The process of retrieving a package (and its dependencies) into the bootstrapper’s internal registries.
This may involve downloading assets, loading modules, and storing metadata, but does not automatically integrate them into the runtime environment.

---

## **Module**

A JavaScript module or script loaded by a package.
Modules may expose functions or classes used by your runtime.

---

## **Mount**

The process of integrating previously loaded assets/modules into the active runtime environment — for example, injecting HTML/CSS into the DOM or binding modules to live systems.

---

## **Package**

A unit of deployable content.
May contain assets, modules, dependencies, and run hooks.

---

## **packageResource**

The normalized form of a package reference (string, object, or inline) used by the loader.
See **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**.

---

## **Repo Resource**

A definition of where and how to fetch a package (URL, HTTP method, optional POST data, etc.).
See **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**.

---

## **Run Hook**

A special hook in a package’s definition that is executed after loading.
Often used for initialization logic.

---
## **Unload**

The process of removing a package from the bootstrapper’s internal registries, clearing its modules and asset references from memory.
Does not necessarily remove already-mounted elements from the runtime environment.

---

## **Unmount**

The process of removing a package’s assets/modules from the active runtime environment.
May also trigger cleanup of associated caches, DOM elements, or event bindings.
Does not necessarily unload the package from the bootstrapper.

---

## **Visited List**

An internal tracking structure used during dependency resolution to avoid loading the same package multiple times.

---

## **Symbolic Resource Name**

A short identifier (e.g., `"scene:chess"`) that is resolved via repo settings or mapping tables into a full package URL.

---

**See Also:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**


# --- end: docs/usage/GLOSSARY.md ---



# --- begin: docs/usage/HOOKS_AND_HANDLERS.md ---

# 🔗 Hooks & Handlers

Hooks and handlers let you inject custom logic into the package lifecycle. They run when items **load** or **fail**, and can be used to mount assets, integrate modules, trigger UI changes, or clean up resources.

> **Tip — Automated Mounter:** When **loading**, include `"#runners.mount"` in your `options.load` handlers to auto‑mount HTML assets. When **unloading**, include `"#runners.unmount"` in `onDone` to unmount. These are bootstrapper‑local methods intended for mounting/teardown.

> **Debugging note:** Reports are live objects and may log inconsistently due to async updates. For stable console output, clone, or capture data with report.toJSON() before printing:
>
> ```js
> console.log(report.toJSON());
> ```

---

## Handler Types

A handler can be **any** of the following:

| Type                          | Example                                       | Description                                                                                                 |
| ----------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Function**                  | `(sys, ctx) => { console.log(ctx.results); }` | Direct function callback with system and context args.                                                      |
| **Global function name**      | `"myGlobalFn"`                                | Resolved from the global scope.                                                                             |
| **Symbolic module reference** | `"@pkg.module.fn"`                            | Calls the `fn` export of `pkg.module` from a loaded package.                                                |
| **Package‑local reference**   | `"~module.fn"`, `"~fn"`                       | Resolves within the *current* package **only during that package’s phase** (see availability matrix below). |
| **Local bootstrap method**    | `"#runners.mount"`, `"#runners.unmount"`            | Calls a method on the current `BootStrap` instance. (Argument passing not supported.)                       |
| **functionResourceObject**    | `{ fn: "@pkg.module.fn", bind: true }`        | Structured form that normalizes any handler input; see **Function Resource Objects** below.                 |

---

## Context Shape by Phase

`sys` is always the calling system instance (usually `bootstrap`). The **`ctx`** object varies by which subsystem/phase invoked your handler.

### 📦 Repo Loader

* **`~local` availability:** ❌ No access to `~function` (no active package context)
* **Per‑item:** `itemLoad` / `itemError`

  * `ctx = { node, def, report }`
    *(on error, `def` may be nullish)*
* **Aggregate:** `load` / `error`

  * `ctx = { input, output, report }`
* **Report type:** `RepoLoadReport`

### 🖼 Asset Loader

* **`~local` availability:** ⚠️ *May* resolve, but **unreliable** due to load order — **not recommended**.
* **Per‑item:** `itemLoad` / `itemError`

  * `ctx = { pkg, asset, id, batch, report }`
  * `batch` is the batch controller; likely incomplete while requests are in flight.
  * `report` is **partially filled** for per‑item callbacks.
* **Aggregate:** `load` / `error`

  * `ctx = { pkg, sync, batchResults, report }`
  * `sync` is the sync‑loader for the `net.batch.run` request.
  * `batchResults` is the completed output of `net.batch.run`.
* **Report type:** `AssetLoadReport`

### 📜 Module Loader

* **`~local` availability:** ✅ **Moderate** — works if the target module loaded successfully. Any module in that package can be targeted, so even if triggered by a different item, handlers could potentially access other modules in the same package.
* **Per‑item:** `itemLoad` / `itemError`

  * `ctx = { pkg, report, module }`
  * `module` item shape:
    `.then(mod => ({ status: 'fulfilled', id: fullID, mod }))`
    `.catch(err => ({ status: 'rejected',  id: fullID, err }))`
* **Aggregate:** `load` / `error`

  * `ctx = { pkg, report }`
* **Report type:** `ModuleLoadReport`

### 📦 Package Loader (Hooks)

* **`~local` availability:** ✅ **Full** — package‑local `~function` hooks are permitted.
* **Execution:** hooks only run if **enabled** and **module loading succeeded**.
* **Hook phases:** `hooks` / `load` / `error`

  * `ctx = { pkg, report }`
* **Report type:** `PackageLoadReport`

### 🚀 Bootstrap (Top‑Level)

* **`~local` availability:** ❌ None — no single package is in scope.
* **Aggregate only:**

  * `ctx = { report, options, err }`
    *(Errors may also be present inside per‑phase reports.)*
* **Report type:** `BootStrapLoadReport`

> **Report completeness:** Per‑item handlers may receive **incomplete** reports while work is still in progress. Aggregate `load`/`error` handlers receive **finalized** reports.

---

## Function Resource Objects

Handlers passed to `load()`/`unload()` can be strings, functions, or structured objects. Internally, they are normalized into a **functionResourceObject** so the runtime can process them consistently.

**What it is:** a normalized object with at least `{ fn, bind, original }`, and flags for how the reference should be resolved.

**Prefixes & meaning:**

* `@` — **Symbolic module reference** in a loaded package, e.g. `"@ui.toast.show"` → `ui.toast.show` export.
* `~` — **Package‑local** reference (valid only during that package’s phase), e.g. `"~setup"`, `"~module.init"`.
* `#` — **Bootstrapper‑local** method, e.g. `"#runners.mount"`, `"#runners.unmount"`.
* *(none)* — Global function name or direct function reference.

**Examples (conceptual):**

```js
"@foo.bar"           // → { fn: "foo.bar", symbolic: true, bind: false, original: "@foo.bar" }
"myFunc"             // → { fn: "myFunc", symbolic: false, bind: false, original: "myFunc" }
() => {}              // → { fn: [Function], bind: false, original: "anonymous" }
{ fn: "@pkg.fn", bind: true }
// → { fn: "pkg.fn", symbolic: true, bind: true, original: "@pkg.fn" }
```

See [`functionResourceObject`](PACKAGE_SPECIFICATIONS.md#functionresourceobject) for the full schema and normalization rules.

---

## Attaching Handlers

Attach handlers when calling `.load()` or `.unload()`:

```js
const onLoad  = ["#runners.mount", "@ui.notify.loaded", (sys, ctx) => console.log("Loaded:", ctx.results)];
const onError = ["jobFail", (sys, ctx) => console.warn("Failed:", ctx.failed)];

await bootstrap.load(resources, { load: onLoad, error: onError });
```

> **Note:** Because `~` package‑local references only resolve during that package’s own phase, avoid using `~` in **aggregate** handler arrays that execute after all packages complete.

---

## Multiple Handlers

You can provide arrays of handlers — they will run in order:

```js
const onLoad = [
  "#runners.mount",
  "@ui.notify.loadComplete",
  { fn: "@telemetry.log", bind: true, meta: { level: "info" } },
  (sys, ctx) => { console.log("Custom post-load", ctx); }
];
```

---

## Using Handlers with Unload

Same system for `.unload()`:

```js
await bootstrap.unload(
  ["scene:chess"],          // packages to unload
  ["#runners.unmount"],        // onDone handlers (unmount assets via automated mounter)
  ["jobFail"],              // onError handlers
  { ignoreMissing: true }
);
```

---

## Error Handling Notes

* If a handler throws, it will not stop other handlers from running.
* If you need guaranteed cleanup, ensure your logic is wrapped in `try/finally`.

---

## Best Practices

* Keep handlers small — delegate complex work to dedicated modules.
* Prefer **symbolic `@` refs** so functions resolve automatically from loaded packages.
* Use `~` only for **package‑local, phase‑local hooks**; avoid in aggregate handlers.
* Include `"#runners.mount"` / `"#runners.unmount"` if you want the automated mounter to mount/unmount assets.
* Remember: your `options` object is passed to handlers as `ctx.options`; you can namespace custom data there (e.g., `options.ui`, `options.telemetry`).

---

**Related Topics:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Mounting & Unmounting Packages](MOUNTING.md)**
* **[Package & Repo Specifications → functionResourceObject](PACKAGE_SPECIFICATIONS.md#functionresourceobject)**
* **[Runners Module](RUNNERS.md)** — convenience helpers for converting `#` handlers into mount/unmount calls


# --- end: docs/usage/HOOKS_AND_HANDLERS.md ---



# --- begin: docs/usage/INSTALLATION.md ---

← Back to [Usage Guide Index](TOC.md)

# 📦 Installation

## Overview

**M7BootStrap** is distributed as plain JavaScript and can be dropped into any ES module–compatible environment.
There’s no build process required — simply include the files in your project and import them.

---

## 1. Clone or Download

You can include **M7BootStrap** directly in your project by cloning the repository or downloading it as a ZIP.

```bash
# Clone repository
git clone https://github.com/linearblade/m7bootstrap.git

# Or download ZIP from GitHub and extract
```

Recommended project structure:

```
/vendor/
  m7Bootstrap/
    BootStrap.js
  m7Fetch/
    src/
      index.js
```

---

## 2. Install Dependencies

M7BootStrap requires **m7Fetch** for all package and asset fetching.

If using Git:

```bash
git clone https://github.com/linearblade/m7fetch.git vendor/m7Fetch
```

If downloading manually:

* Place **m7Fetch** in your `/vendor/` directory (or anywhere you prefer).
* Ensure the relative import path in your code matches your folder layout.

---

## 3. Import into Your Project

```js
//adjust as necessary if you split the source from your docs.
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

const net = new Net();
const bootstrap = new BootStrap(net);
```

---

## 4. Verify Setup

Run a minimal test to confirm installation:

```js
const ok = await bootstrap.load(
  [{ resource: "scene:test", repo: ["/repo"] }],
  {
    load: (sys, ctx) => console.log("Loaded:", ctx),
    error: (sys, ctx) => console.warn("Failed:", ctx)
  }
);

console.log("Boot status:", ok);
```

If you see `Loaded:` \[...] in the console, your installation is working.

---

## Next Steps

Continue to **[Basic Concepts](BASIC_CONCEPTS.md)** to learn the core ideas behind packages, repos, and handlers.


# --- end: docs/usage/INSTALLATION.md ---



# --- begin: docs/usage/INTRODUCTION.md ---

← Back to [Usage Guide Index](TOC.md)

# 📘 Introduction & Requirements

## Introduction

**M7BootStrap** is a runtime package management toolkit designed to simplify loading, mounting, and unloading packages in dynamic JavaScript environments.  
It abstracts away the complexity of fetching, integrating, and organizing assets and modules, allowing you to focus on application logic instead of plumbing.

It is backend-agnostic — because it’s written entirely in JavaScript, it can run in browsers, Node.js, Electron, or any JS runtime that supports ES modules.  
No special server setup is required beyond serving your package files.

Typical use cases include:

- Loading modular application components on demand
- Coordinating asset and code package dependencies at runtime
- Building tools, editors, or games that require dynamic resource management
- Providing a consistent package interface in projects without a static build pipeline

---

## Requirements

To use **M7BootStrap**, you’ll need:

1. **JavaScript Runtime**  
   - Modern browser with ES module support, **or**  
   - Node.js ≥ 18.x (earlier versions may work with ES module flags enabled)

2. **[m7Fetch](https://github.com/linearblade/m7fetch)**  
   - Required for HTTP/package fetching.  
   - Handles all network requests, package resolution, and repo interactions.

3. **Package Sources**  
   - Packages must be accessible via URL or inline definition.
   - Supported forms:
     - Direct URL string  
     - `packageResourceObject` with `resource` and optional `repo`  
     - Inline package definition

4. **Basic Knowledge**  
   - Understanding of JavaScript modules (`import`/`export`)  
   - Familiarity with asynchronous code (`async`/`await`)

---

## Next Steps

Once you’ve reviewed the requirements, proceed to [Installation](INSTALLATION.md) for setup instructions.

# --- end: docs/usage/INTRODUCTION.md ---



# --- begin: docs/usage/LOADING_PACKAGES.md ---

← Back to [Usage Guide Index](TOC.md)

# 📦 Loading Packages

The `load()` method is the primary way to bring packages, modules, and assets into your runtime environment. It handles dependency resolution, parallel downloading, and lifecycle hooks.

---

## Syntax

```js
const ok = await bootstrap.load(resources, options?);
```

**Parameters:**

| Name      | Type                      | Description                                                           |
| --------- | ------------------------- | --------------------------------------------------------------------- |
| resources | string \| object \| array | One or more `packageResource` inputs — see **Package Specifications** |
| options   | object *(optional)*       | Loader configuration (see below).                                     |

---

## Options

Options are passed as the **second** argument to `load()`. All provided options are also passed to any handlers executed, and can be accessed inside the `ctx` variable.

```js
{
  "load": ["jobDone", "#runners.mount"],
  "error": "jobFail",
  "limit": 8,
  "package": {
    "limit": 5,
    "hooks": true,
    "load": "packageLoad",
    "error": "packageError"
  },
  "repo": {
    "limit": 5,
    "itemLoad": "repoItemLoad",
    "itemError": "repoItemError",
    "load": "repoLoad",
    "error": "repoError"
  },
  "module": {
    "limit": 5,
    "itemLoad": "moduleItemLoad",
    "itemError": "moduleItemError",
    "load": "moduleLoad",
    "error": "moduleError"
  },
  "asset": {
    "limit": 5,
    "itemLoad": "assetItemLoad",
    "itemError": "assetItemError",
    "load": "assetLoad",
    "error": "assetError"
  }
}
```

**Fields**

| Path                  | Type    | Default | Notes                                                        |
| --------------------- | ------- | ------- | ------------------------------------------------------------ |
| `limit`               | integer | `8`     | Global concurrency cap for parallel loads.                   |
| `package.hooks`       | boolean | `true`  | Run each package’s `run` hooks after load.                   |
| `repo.circuitbreaker` | integer | `100`   | Safety cutoff for runaway or circular dependency traversal.  |
| `repo.limit`          | integer | `limit` | Repo concurrency limit; falls back to global `limit`.        |
| `module.limit`        | integer | `limit` | Module fetch/load concurrency limit.                         |
| `asset.limit`         | integer | `limit` | Asset fetch concurrency limit; falls back to global `limit`. |
| `asset.awaitAll`      | boolean | `true`  | Wait for all assets to complete before returning control.    |

\--------------------- | ------- | ------- | ----------------------------------------------------------- |
\| `limit`               | integer | `8`     | Global concurrency cap for parallel loads.                  |
\| `package.hooks`       | boolean | `true`  | Run each package’s `run` hooks after load.                  |
\| `repo.circuitbreaker` | integer | `100`   | Safety cutoff for runaway or circular dependency traversal. |
\| `repo.limit`          | integer | `limit` | Repo concurrency limit; falls back to global `limit`.       |
\| `assets.limit`        | integer | `limit` | Asset fetch concurrency limit; falls back to global `limit`.|
\| `assets.awaitAll`     | boolean | `true`  | Wait for all assets to complete before returning control.   |

---

## Resource Forms

`resources` can be:

1. **Symbolic string** — `"scene:chess"`
2. **Repo-wrapped** — `{ resource: "scene:chess", repo: ["/repo"] }`
3. **Inline package** — `{ resource: { id: "...", assets: [...], modules: [...] } }`

---

## Function Resource Arguments in Handlers

Handler fields in `options` (e.g., `load`, `error`, and per-scope fields like `repo.itemLoad`/`module.itemError`) accept **function resource arguments**, normalized into [`functionResourceObject`](PACKAGE_SPECIFICATIONS.md#functionresourceobject) form.

Examples include:

* Direct function reference
* String references:

  * `"@pkg.module.fn"` → function inside a loaded package
  * `"~module.fn"` or `"~fn"` → package-local reference
  * `"#runner.mount"` → bootstrapper-local method reference
  * `"myFunction"` → global function name
* Object form with `{ fn: ... }` and optional flags/metadata.

---

## Example — Basic Load

```js
const resources = [
  { resource: "scene:chess", repo: ["/repo"] },
  "@resources.allpurposemounter"
];

const ok = await bootstrap.load(resources, {
  load: ["#runner.mount", (sys, ctx) => console.log("Loaded:", ctx.results)],
  error: [(sys, ctx) => console.error("Failed:", ctx.failed)],
  package: { hooks: true }
});

if (!ok) {
  console.error("One or more packages failed to load");
}
```

---

## Dependency Resolution

1. Build dependency graph.
2. Add required packages (including transitive dependencies) to the queue.
3. Download in parallel.
4. Mount packages once all resources are retrieved.

> Parallel loading means dependency execution order isn’t guaranteed — wait for the `load` handler in `options`.

---

## Hooks & Handlers

Specify handlers via the **options object** (e.g., `load`, `error`, `repo.itemLoad`, `repo.itemError`, `module.itemLoad`, `asset.load`, etc.).

Handler types:

* Function — `(sys, ctx) => { ... }`
* Global function name — `"myFunction"`
* Symbolic module ref — `"@pkg.module.fn"`
* Package-local ref — `"~module.fn"` or `"~fn"`
* Bootstrap method — `"#runner.mount"`
* `functionResourceObject`

---

## Common Patterns

**Multiple Repos**

```js
await bootstrap.load({
  resource: "scene:chess",
  repo: ["/primary-repo", "/backup-repo"]
});
```

**Inline Packages**

```js
await bootstrap.load({
  resource: {
    id: "allpurposemounter",
    assets: [{ id: "mountinstructions", inline: true, content: { a: "b" } }],
    modules: [],
    run: ["mountusMaximus"]
  }
});
```

---

## Unload

```ts
async unload(resources, onDone?, onError?, options?): Promise<boolean>
```

Options:

| Option          | Type    | Default | Description                                              |
| --------------- | ------- | ------- | -------------------------------------------------------- |
| `ignoreMissing` | boolean | `true`  | Ignore missing packages.                                 |
| `cascade`       | boolean | `false` | Remove dependencies as well as specified packages.       |
| `keepAssets`    | boolean | `false` | Keep assets mounted/registered instead of removing them. |
| `keepModules`   | boolean | `false` | Keep modules registered instead of clearing them.        |

> To unmount assets, include `"#runner.unmount"` in `onDone`.

---

**Related Topics:**

* [Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)
* [Hooks & Handlers](HOOKS_AND_HANDLERS.md)
* [Mounting & Unmounting Packages](MOUNTING.md)
* [Runners Module](RUNNERS.md) — automate mounting/unmounting directly from load/unload contexts


# --- end: docs/usage/LOADING_PACKAGES.md ---



# --- begin: docs/usage/MOUNTING.md ---

← Back to [Usage Guide Index](TOC.md)

# 🧰 Mounting and unmounting assets

Mounting is **not the same** as loading. *Loading/unloading* retrieves packages, resolves dependencies, and manages module/asset registries. *Mounting/unmounting* injects or removes concrete DOM elements described by package **mount assets**.

> The Mount Manager consumes assets of type **`mount`** (JSON configs), injects their DOM nodes, and tracks them so corresponding **unmount** calls can cleanly remove them. It works via the `#runner.mount` / `#runner.unmount` handlers you attach to `load()` / `unload()`.

---

## When to Use

* **During load:** call `#runner.mount` in your `onLoad` handlers to auto‑inject HTML/DOM assets.
* **During unload:** call `#runner.unmount` in `onDone` to remove previously injected nodes.
* **Package‑scoped mounting (planned/now supported):** target specific package IDs when mounting/unmounting.

---

## How It Works

1. **Discover mount assets.** The manager queries the bootstrapper for all assets with `type: "mount"`, producing an id→entry map.
2. **Inject DOM nodes.** For each asset’s `items[]`, it calls the DOM injector with selector, method, container, and attributes to create and place nodes.
3. **Track for teardown.** Injected nodes are registered in a DOM registry, grouped by **package ID**, so later unmount can remove them by group.

> Current code path (simplified): `injectAssets()` → `inject()` (resolve per‑package asset + call DOM injector) → `track()` (group by pkgId).

---

## Mount Asset Schema

A **mount asset** is a JSON config with an `items` array. Each item describes how to inject one node.

```ts
// Minimal conceptual schema for a mount item
{
  id: string,          // required: local asset ID (must exist in the package)
  selector?: string,   // CSS selector to target; default: 'body'
  container?: string,  // wrapper tag name: 'div' | 'section' | 'style' | 'template' | ...
  method?: string,     // 'replace' | 'before' | 'after' | 'prepend' | 'append' (default: 'append')
  dissolve?: boolean,  // if true and wrapper has one child, replace wrapper with its child
  attrs?: object       // HTML attributes to apply to the wrapper
}
```

The runtime resolves the package‑local \*\*asset \*\*\`\` and hands its content to the DOM injector with the above placement options.

---

## API: Handlers

### `#runner.mount`

Mount all eligible `type:"mount"` assets.

* **Default behavior:** inject all `mount` assets for the relevant packages.
* **Tracking:** nodes are recorded in the DOM registry under their **package group** for later removal.

### `#runner.unmount`

Remove previously injected nodes.

* **Default behavior (legacy builds):** clear the DOM registry (global).
* **Planned/updated behavior:** unmount by **package ID** (or set of IDs), leaving other packages’ nodes intact.

---

## Package Targeting

We support (or are introducing) **package‑scoped** mounting/unmounting. Use one of the following patterns:

### 1) Via `options` (works today and future‑proof)

Pass target packages in the `options` object (accessible to handlers via `ctx.options`).

```js
await bootstrap.load(resources,
  [
    { fn: "#runner.mount" } // handler sees ctx.options.mount.packages
  ],
  null,
  {
    mount: { packages: ["scene:chess", "allpurposemounter"] }
  }
);

await bootstrap.unload(
  ["scene:chess"],
  [ { fn: "#runner.unmount" } ],
  null,
  { mount: { packages: ["scene:chess"] } }
);
```

### 2) Via functionResourceObject args (planned direct args)

If/when `#mount.*` accepts inline args on the handler:

```js
const onLoad = [
  { fn: "#runner.mount", args: { packages: ["scene:chess"] } }
];

const onDone = [
  { fn: "#runner.unmount", args: { packages: ["scene:chess"] } }
];
```

Both approaches result in **per‑package** injection/teardown rather than global effects.

---

## Usage Examples

### Mount during Load

```js
const onLoad = ["#runner.mount"]; // auto‑inject mount assets from loaded packages
await bootstrap.load(resources, onLoad, ["jobFail"], {
  hooks: true,
  mount: { packages: ["scene:chess"] } // optional narrowing
});
```

### Unmount during Unload

```js
await bootstrap.unload(
  ["scene:chess"],
  ["#runner.unmount"],    // remove nodes injected for this package
  ["jobFail"],
  { mount: { packages: ["scene:chess"] } }
);
```

---

## Notes & Caveats

* **Selector defaults:** if `selector` is omitted, elements are appended to `document.body`.
* **Per‑package lookups:** injected items resolve using the package‑scoped asset registry; a missing local id logs a warning.
* **Registry semantics:** nodes are tracked with `group = pkgId` so unmount can target a specific package.
* **Legacy behavior:** older builds call `registry.clear(null, true)` on unload (clears broadly); newer behavior targets groups.

---

## Troubleshooting

* **Nothing appears in the DOM**

  * Confirm you shipped an asset of `type: "mount"` and its `content.body.items` array is present.
  * Verify the local `id` matches an asset in the package.
* **Unmount removed too much**

  * Ensure you’re passing `packages: [...]` via `options.mount` (or handler args) so only that package’s nodes are cleared.
* **Selector conflicts**

  * Use a more precise `selector` and `container`, or set `attrs` with unique `id`/`class` values.

---

**Related Topics**

* **[Loading Packages](LOADING_PACKAGES.md)** — attach `#runner.mount` in `onLoad`
* **[Mounting & Unmounting Packages](MOUNTING.md)** — attach `#runner.unmount` in `onDone`
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)** — handler forms & `functionResourceObject`
* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)** — asset definitions & function resource objects


# --- end: docs/usage/MOUNTING.md ---



# --- begin: docs/usage/PACKAGE_SPECIFICATIONS.md ---

← Back to [Usage Guide Index](TOC.md)

# 📦 Package & Repo Specifications

This section defines the structures used to describe **packages** and **repositories**, including their relationship, valid formats, and resolution rules.

---

## 1. `packageResource`

A `packageResource` is any valid reference to a package that **M7BootStrap** can load.
It can take **three** primary forms:

1. **String** — a direct URL or symbolic resource name
   **Examples:**

   ```js
   "https://example.com/repo/scene/chess.json"
   "scene:chess"
   ```
2. **Object** — a `packageResourceObject`
3. **Inline Package Object** — full package definition included directly in code

---

## 2. `packageResourceObject`

An object form of a package resource.
**Must include:**

* `resource` *(string | object)* — The actual resource to load.
* `repo` *(optional)* — A `repoResource` or array of `repoResource`s.

**Example:**

```json
{
  "resource": "scene:chess",
  "repo": [
    "/repo",
    { "url": "/alt", "method": "POST", "postData": { "foo": "bar" } }
  ]
}
```

---

## 3. `repoResource`

A `repoResource` describes **where and how** to fetch a package.

**Can be:**

1. **String** — base URL for the package

```json
"/repo"
```

2. **Object** — with request metadata:

```json
{
  "url": "/repo",
  "method": "post",          
  "postData": { "foo": "bar" },
  "fetchOpts": { "cache": "no-store" }
}
```

---

## 4. functionResourceObject

A **functionResourceObject** is the normalized representation of a function handler input, ensuring consistent structure and metadata regardless of how the handler was originally specified.

It is produced by parsing a function handler reference, which may be provided as:

* A **direct function reference**
* A **string identifier** (function name or symbolic reference)
* A **configuration object** containing a `fn` field and optional metadata

**Purpose**

By converting any supported handler input into a standardized object, the loader can:

* Identify whether the function is symbolic, package-local, or bootstrapper-local
* Store the original input for reference
* Track binding requirements
* Maintain compatibility across handler formats

**Structure**

A normalized **functionResourceObject** includes at least:

* `fn` — The function reference itself, or a string path to it
* `bind` — Boolean indicating whether the function should be bound to a specific context (true for local `#` references)
* `original` — The original input value as provided by the user
* `symbolic` *(optional)* — True if the function reference is symbolic (prefixed with `@`)
* `local` *(optional)* — True if the reference is bootstrapper-local (prefixed with `#`)
* `pkgLocal` *(optional)* — True if the reference is package-local (prefixed with `~`)

**Examples**

| Input                                          | Normalized Output (key fields only)                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `"@foo.bar"`                                   | `{ fn: "foo.bar", bind: false, symbolic: true, original: "@foo.bar" }`             |
| `"myFunc"`                                     | `{ fn: "myFunc", bind: false, symbolic: false, original: "myFunc" }`               |
| `() => {}`                                     | `{ fn: [Function], bind: false, original: "anonymous" }`                           |
| `function namedFn() {}`                        | `{ fn: [Function: namedFn], bind: false, original: "namedFn" }`                    |
| `{ fn: "@pkg.fn", bind: true, extra: "meta" }` | `{ fn: "pkg.fn", bind: true, symbolic: true, original: "@pkg.fn", extra: "meta" }` |

---
## 5. Inline Package Structure

An inline package definition is a fully self-contained package object.
When `resource` is an object, **no fetching occurs** — it is treated as already resolved.

**Example:**

```json
{
  "resource": {
    "id": "allpurposemounter",
    "title": "General purpose Mounting tool",
    "assets": [
      {
        "id": "mountinstructions",
        "inline": true,
        "content": { "a": "b", "nums": [1, 2, 3] }
      }
    ],
    "modules": [],
    "run": ["mountusMaximus"]
  }
}
```

---

## 6. Examples of Each Form

**String form**

```js
"scene:chess"
```

**Object + String resource**

```json
{ "resource": "scene:chess", "repo": ["/repo"] }
```

**Object + Inline package**

```json
{ "resource": { "id": "pkg1", "assets": [], "modules": [] } }
```

---

## 7. Resolution Rules

When loading a `packageResource`:

1. **Inline object** — loaded immediately; `repo` is ignored.
2. **String resource + repo** — loader combines repo base URL with resource string. If multiple repos are given, it will try each in sequence until one succeeds.
3. **String resource without repo** — treated as a fully-qualified URL **or** a symbolic name resolved via defaults.
4. **Duplicate detection** — loader normalizes `(type, stem, repos)` to avoid re-fetching the same package.

---

## 8. Relationship Diagram
![relationship diagramt](package_repo_relationship.png)

```
packageResource
 ├─ String  → URL or symbolic name
 └─ Object (packageResourceObject)
      ├─ resource
      │   ├─ String → URL/symbolic + optional repo
      │   └─ Object → Inline package definition
      └─ repo (optional)
           ├─ String  → base URL
           └─ Object  → { url, method, postData, fetchOpts }
```

---

## 9. Validation Notes / Required Fields

* `packageResourceObject.resource` is required and must be string or object.
* **Inline package objects** must have:

  * `id` *(string)* — unique within runtime
  * Optional: `assets` *(array)*, `modules` *(array)*, `run` *(array)*
* `repoResource` objects must have `url` *(string)* if not a plain string.
* Method names (`method`) are normalized to lowercase internally.
* Loader does **not** validate asset/module schema — it trusts package definitions.

---

**See Also**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Mounting & Unmounting Packages](MOUNTING.md)**
* Continue to **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)** to action on your loads and unloads


# --- end: docs/usage/PACKAGE_SPECIFICATIONS.md ---



# --- begin: docs/usage/PERFORMANCE.md ---

← Back to [Usage Guide Index](TOC.md)

# ⚡ Performance Considerations

**M7BootStrap** is designed for fast runtime package loading, but there are strategies and caveats to keep in mind when optimizing performance.

---

## 1. Parallel Loading

By default, **M7BootStrap** loads packages in parallel for maximum throughput.
This can drastically reduce load times when fetching from high-latency sources.

**Caveat:**
Parallel loading does **not** guarantee dependency order. If strict load order is required, handle integration in a post-load hook.

**Example:**

```js
const onLoad = [
  "#runner.mount",
  (sys, ctx) => integrateDependencies(sys,ctx)
];

await bootstrap.load(resources, {load:onLoad});
```

---

## 2. Concurrency Limits

By default, bootstrap keeps a internal limiter of 8 simultaneous processes per component (repo,module,assets, packages). However a large package list will be queued up at once , as will a large list of assets,etc.

If you are loading many large packages at once, unbounded parallelism may cause:

* Network congestion
* Memory spikes
* API rate limiting (for authenticated sources)

Consider breaking up very large packages into smaller components, and use a concurrency limiter for controlled parallelism:

```js
import { createLimiter } from ".<path_to_bootstrap>/utils/limiter.js";

const limit = createLimiter(8); // max 8 concurrent requests
await Promise.all(resources.map(r => limit(() => bootstrap.load([r]))));
```

Or use built in parallelism (assuming the package size itself is not too large):
```js
bootstrap.load(resources, {limit:8,load,error});
```

---

## 3. Caching

Leverage caching at multiple levels:

* **[m7Fetch](https://github.com/linearblade/m7Fetch)** built-in cache (via net.batch)
* HTTP caching via `Cache-Control` headers
* In-memory registries (e.g., keeping package definitions around after first load)

**Example:** Check `.packages` registry before reloading:

```js
if (!bootstrap.packages.isLoaded("scene:chess")) {
  await bootstrap.load(["scene:chess"]);
}
```

---

## 4. Asset Bundling

For production, consider bundling multiple related assets into a single package to reduce:

* HTTP request overhead
* Round-trip latency

---

## 5. Lazy Loading

Avoid loading every package at startup — defer loading until it’s actually needed in runtime:

```js
async function loadWhenNeeded(pkg) {
  if (!bootstrap.packages.isLoaded(pkg)) {
    await bootstrap.load([pkg]);
  }
}
```

---

## 6. Minimize Inline Package Size

While inline packages avoid network requests, embedding large binary assets directly in JSON will:

* Increase initial script size
* Delay JS parse/compile times

Prefer URLs for large assets instead of embedding them.

---

**Related Topics:**

* **[Advanced Usage](ADVANCED_USAGE.md)**
* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**


# --- end: docs/usage/PERFORMANCE.md ---



# --- begin: docs/usage/QUICK_START.md ---

← Back to [Usage Guide Index](TOC.md)

# 🚀 Quick Start

This example shows the fastest way to get M7BootStrap running in your project.
We’ll initialize the bootstrapper, load a package, and mount its content.

---

## 1. Requirements

* **m7Fetch** for package and asset fetching.
  Repo: [https://github.com/linearblade/m7fetch](https://github.com/linearblade/m7fetch)
* A JavaScript environment that supports `import`/ES modules (Node 18+, modern browsers).

---

## 2. Project Structure

```plaintext
your-project/
  vendor/
    m7Bootstrap/
      BootStrap.js
    m7Fetch/
      src/
        index.js
  index.js
```

---

## 3. Example Package

For demonstration, we’ll use a symbolic package reference and a repo definition:

```js
const resources = [
  { resource: "scene:chess", repo: ["/repo"] }
];
```

---

## 4. Minimal Code Example

```js
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

// Initialize networking layer and bootstrapper
const net = new Net();
const bootstrap = new BootStrap(net);

// Define package load options
const opts = {
  package: { hooks: true } // run package-defined "run" hooks (default: true)
};

// Handlers
const onLoad = [
  "#runner.mount", // symbolic reference to a bootstrapper method
  (sys, ctx) => console.log("Loaded packages:", ctx)
];

const onError = [
  "logFailure",
  (sys, ctx) => console.warn("Failed to load:", ctx)
];

// Load the package(s)
const success = await bootstrap.load(resources,{ load:onLoad, error:onError}, opts);

if (!success) {
  console.error("Bootstrap failed");
}
```

---

## 5. What Happens Here

1. **Dependency resolution** — M7BootStrap builds a dependency graph from resources.
2. **Parallel fetch** — Packages, assets, and modules are retrieved as quickly as possible.
3. **Mounting** — HTML assets are mounted automatically; modules are stored in bootstrap’s registry.
4. **Hooks** — If enabled, any run hooks in packages are executed.
5. **Handlers** — onLoad or onError handlers are run with full context.

---

## 6. Unmounting Example

```js
await bootstrap.unload(
  ["scene:chess"],        // package ids
  ["#runner.unmount"],      // onDone handlers
  ["logFailure"],         // onError handlers
  { ignoreMissing: true } // options
);
```

This removes the package’s mounted assets and clears modules from the bootstrapper.
If you copied modules elsewhere, you’ll need to remove them manually.

---

## Next Steps

* Learn how to configure resources and repos in detail: **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**
* Explore the full set of lifecycle hooks and event handlers: **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* Continue to **[Core API Overview](CORE_API_OVERVIEW.md)** to learn the primary methods exposed for use

# --- end: docs/usage/QUICK_START.md ---



# --- begin: docs/usage/RUNNERS.md ---

← Back to [Usage Guide Index](TOC.md)

# 🏃 Runners Module

The **Runners** module is a helper for translating `#` symbolic handlers into calls to local system methods, especially when load/unload handlers are invoked with arguments in less‑friendly formats.

It is accessible as `bootstrap.runners`.

---

## Purpose

When you attach a handler like `"#runners.mount"` or `"#runners.unmount"` in your `load`/`error`/`onDone` hooks, the **Runners** module:

1. Parses the `ctx` object provided to the handler.
2. Extracts relevant package IDs from the reports.
3. Forwards each package ID to the appropriate `bootstrap.mount` method.

This allows you to replace direct calls like `"#mount.load"` with `"#runners.mount"`, which automatically handles iteration over multiple packages in the context.

---

## API

### `mount(sys, ctx)`

For each package listed in `ctx.report.packages`, calls:

```js
bootstrap.mount.load(pkgId);
```

Use in `load`-phase handlers to mount packages after they have loaded.

### `unmount(sys, ctx)`

For each package listed in `ctx.report.packages`, calls:

```js
bootstrap.mount.unload(pkgId);
```

Use in `unload`-phase handlers (or top‑level `onDone`) to unmount packages after they have been unloaded.

---

## Example Usage

```js
await bootstrap.load(resources, {
  load: ["#runners.mount"],
  error: ["jobFail"]
});

await bootstrap.unload(["scene:chess"],
  ["#runners.unmount"],
  ["jobFail"]
);
```

In both cases, the runner inspects `ctx.report.packages` and forwards each `pkgId` to the `bootstrap.mount` subsystem.

---

## When to Use Runners

* You want **automatic iteration** over all packages in a load/unload context.
* You want to **simplify handler wiring**, avoiding manual loops over `ctx.report.packages`.
* You prefer symbolic handler references (`"#runners.mount"`) that can be resolved consistently across the system.

---

**Related Topics:**

* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* **[Mounting & Unmounting Packages](MOUNTING.md)**


# --- end: docs/usage/RUNNERS.md ---



# --- begin: docs/usage/TOC.md ---

← Back to [README](../../README.md)

# 📘 Usage Guide — Table of Contents

## 1. [Introduction & Requirements](INTRODUCTION.md)

## 2. [Installation](INSTALLATION.md)

## 3. [Basic Concepts](BASIC_CONCEPTS.md)

## 4. [Quick Start](QUICK_START.md)

## 5. [Core API Overview](CORE_API_OVERVIEW.md)

## 6. [Loading Packages](LOADING_PACKAGES.md)

## 7. [Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)

* packageResource
* packageResourceObject
* repoResource
* functionResourceObject
* Inline package structure
* Examples of each form (string, object, inline)
* Resolution rules
* Relationship diagram
* Validation notes / required fields

## 8. [Hooks & Handlers](HOOKS_AND_HANDLERS.md)

## 9. [Mounting and Unmounting Packages](MOUNTING.md)

## 10. [Runners Module](RUNNERS.md)
* Helper for translating #runners.* handlers into mount/unmount calls

## 11. [Accessing Data](ACCESSING_DATA.md)
* How to retrieve loaded packages, assets, and modules via bootstrap.data

## 12. [Advanced Usage](ADVANCED_USAGE.md)

## 13. [Performance Considerations](PERFORMANCE.md)

## 14. [Troubleshooting](TROUBLESHOOTING.md)

## 15. [Examples Library](EXAMPLES_LIBRARY.md)

## 16. [Glossary](GLOSSARY.md)


# --- end: docs/usage/TOC.md ---



# --- begin: docs/usage/TROUBLESHOOTING.md ---

← Back to [Usage Guide Index](TOC.md)

# 🛠 Troubleshooting

This section covers common issues you may encounter when using **M7BootStrap** and how to resolve them.

---

## 1. Package Not Found

**Symptoms:**

* Error in console: `Package not found` or `404`
* `onError` handler triggered with `ctx.failed` pointing to the missing package

**Causes:**

* Incorrect package ID or symbolic name
* Missing or misconfigured `repo` field
* Repo server not reachable
* Repo hosted on a different domain without proper credentials configuration
* Package retrieved is invalid or incorrectly formatted JSON
* Repo requires special configuration (e.g., credentials, HTTP method, or POST data for keys)
* Multiple repos configured but not all properly set up

**Solutions:**

* Verify the `resource` field is correct:

  ```js
  { resource: "scene:chess", repo: ["/repo"] }
  ```
* Check that your repo server is online and accessible.
* If symbolic names are used (e.g., `@resources.pkgname`), confirm your resolver is set up.
* If your repo is not hosted on the same domain as the page loading it, configure the `net` instance to send appropriate credentials. See **m7Fetch** documentation for configuration.
* If the retrieved package is incorrectly formatted JSON, check the console for parsing errors and fix the source package.
* If your repo requires special considerations (e.g., credentials, HTTP method, POST data for API keys), configure the repo accordingly. See **Package & Repo Specifications**.
* If you have multiple repos, they will be tried in order. Ensure all repos are properly configured and reachable.

---

## 2. Dependencies Not Loaded in Order

**Symptoms:**

* A package’s code references another package’s module before it’s available.

**Cause:**

* **M7BootStrap** loads packages in parallel for speed.

**Solutions:**

* Wait until all packages finish loading before integration:

  ```js
  const report = await bootstrap.load(resources, {load,error});
  if (report.success) {
    integrateAllPackages();
  }
  ```
* Or handle order manually in `onLoad`.

---

## 3. Hooks Not Triggering

*Symptoms:**

* `onLoad` or `onError` handlers do not run.

**Causes:**
* handlers are specified in the options object. See **[Loading Packages](LOADING_PACKAGES.md)** for information on loading packages.
* packages hooks must be set to true in options {package:{hooks:true}}
* Hook references are incorrect.
* Using a string reference that doesn’t match a registered handler.
* Using symbolic reference types incorrectly (see **Hooks & Handlers** for details).

**Solutions:**

* Use explicit functions for testing:

  ```js
  const onLoad = (sys, ctx) => console.log("Loaded:", ctx.results);
  ```
* Verify symbolic/local handler references exist in the expected scope.
* For symbolic reference types:

  * `~module.function` or `~function` — Used specifically during the **load phase for that package**, references `thisPackage.module.function`. Not valid for general `onLoad` or error handlers.
  * `@somePackage:module.function` — References a module function in a package loaded into the bootstrapper.
  * `#runner.mount` or `#runner.unmount` — Calls bootstrapper methods, primarily for mounting/unmounting operations (no argument support currently).
  * Invalid function resources — Functions must be direct, symbolic, or a resource object (see **Package & Repo Specifications**).

---

## 4. Inline Packages Not Loading Assets

**Symptoms:**

* Inline-defined packages load, but assets don’t appear.

**Causes:**

* Missing `inline: true` flag on asset entries.
* Asset processing logic may not handle the format used.

**Solutions:**

* Ensure each inline asset includes:

  ```js
  { id: "assetId", inline: true, content: {...} }
  ```
* Confirm your asset mounting logic supports inline assets.

---

## 5. Unmount Leaves Copied Modules

**Symptoms:**

* After `unload()`, modules remain in your custom location.

**Cause:**

* **M7BootStrap** clears its own registries but cannot remove modules you copied elsewhere.

**Solutions:**

* Add a cleanup step in your unload handler:

  ```js
  await bootstrap.unload(
    ["scene:chess"],
    ["#runner.unmount", cleanupCustomModules]
  );
  ```

---

## 6. Repo Request Errors

**Symptoms:**

* Network errors, timeouts, or fetch failed.

**Causes:**

* Wrong repo URL or method.
* Cross-origin restrictions.

**Solutions:**

* Double-check the repo config:

  ```js
  { url: "/repo", method: "post", postData: {...} }
  ```
* Use absolute URLs for remote repos.
* Configure CORS on the repo server if needed.
* See **m7Fetch** for client-side configuration, and ensure no base directory is set for it — or set `fetchOpts: { absolute: true }` in the repo config if needed.
---

## 7. Debugging Tips

* Enable verbose logging in your environment.
* Inspect the console output for failed resource URLs.
* Log the results of `bootstrap.packages` to see loaded packages.
* For complex dependency chains, manually inspect your `packageResource` objects before loading.

---

**Related Topics:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* **[Performance Considerations](PERFORMANCE.md)**


# --- end: docs/usage/TROUBLESHOOTING.md ---



# --- begin: docs/usage/UNMOUNTING_PACKAGES.md ---

← Back to [Usage Guide Index](TOC.md)

# 🗑️ Unmounting Packages

Unmounting removes packages from the runtime, clears associated modules, and can optionally clean up assets or run teardown handlers.

---

## Basic Usage

Call `.unload()` on your `BootStrap` instance:

```js
await bootstrap.unload(
  ["scene:chess"],          // packages to unload
  ["#runner.unmount"],        // onDone handlers
  ["jobFail"],              // onError handlers
  { ignoreMissing: true }   // options
);
```

---

## Arguments

`.unload(packages, onDone?, onError?, options?)`

| Argument | Type       | Description                                 |
| -------- | ---------- | ------------------------------------------- |
| packages | array      | Package IDs or objects with an `.id` field. |
| onDone   | handler(s) | Handlers to run after successful unload.    |
| onError  | handler(s) | Handlers to run if unload fails.            |
| options  | object     | Unload behavior flags.                      |

---

## Options

| Option        | Type    | Default | Description                                              |
| ------------- | ------- | ------- | -------------------------------------------------------- |
| ignoreMissing | boolean | false   | If true, skip errors for packages not currently loaded.  |
| clearAssets   | boolean | true    | If true, remove registered assets from asset registry.   |
| clearModules  | boolean | true    | If true, remove registered modules from module registry. |

---

## Handler Context

Unload handlers (`onDone`, `onError`) receive the same `(sys, ctx)` arguments as load handlers:

* **sys** — The `BootStrap` instance
* **ctx** — Fields:

  * `results` — Array of unloaded packages
  * `failed` — Package that failed to unload (if any)
  * `options` — Options object passed to `.unload()`
  * `err` — Error object if unload failed

---

## Notes & Caveats

* Unmounting works correctly — packages are removed from the bootstrapper’s registries.
* External copies are your responsibility — if you copied modules elsewhere during load, you must remove them manually.
* Modules can be run in place — you don’t have to relocate them; unloading is optional if your app doesn’t need to free memory or remove references.
* Unmount hooks — you can attach package-defined unmount hooks (via `run` array) if desired.

---

## Example

```js
const resources = [
  { resource: "scene:chess", repo: ["/repo"] },
  "@resources.allpurposemounter"
];

// Load packages
await bootstrap.load(resources, ["#runner.mount"]);

// Later, unload
await bootstrap.unload(
  ["scene:chess", "allpurposemounter"],
  ["#runner.unmount"],
  ["jobFail"],
  { ignoreMissing: true }
);
```

---

**Related Topics:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**


# --- end: docs/usage/UNMOUNTING_PACKAGES.md ---



# --- begin: docs/USE_POLICY.md ---

# 📘 M7BootStrap Use Policy

This document outlines how you may use M7BootStrap under the **Moderate Team License (MTL-10)** and what is expected of you as a user.

---

## ✅ Free Use — What You Can Do

You may use M7BootStrap **for free** if you fall under any of the following categories:

* **Individuals** using it for personal projects, learning, or experimentation
* **Academic institutions or researchers** using it for teaching, papers, or labs
* **Nonprofits and NGOs** using it internally without revenue generation
* **Startups or companies** with **10 or fewer users** of M7BootStrap internally

  * This includes development, deployment, and operational use

There is **no cost, license key, or approval required** for these use cases.

---

## 🚫 Commercial Restrictions

M7BootStrap **may not be used** in the following ways without a paid commercial license:

* As part of a **commercial product** that is sold, licensed, or monetized
* Embedded within a platform, device, or SaaS product offered to customers
* Internally at companies with **more than 10 users** working with M7BootStrap
* As a hosted service, API, or backend component for commercial delivery
* In resale, sublicensing, or redistribution as part of paid offerings

---

## 🔒 Definitions

* **User**: Anyone who installs, configures, modifies, integrates, or interacts with M7BootStrap as part of their role.
* **Commercial use**: Use in a context intended for revenue generation or business advantage (e.g. SaaS, enterprise ops, service platforms).

---

## 💼 Licensing for Larger or Commercial Use

If your company, product, or service falls outside the free use scope:

📩 **Contact us at \[[legal@m7.org](mailto:legal@m7.org)]** to arrange a commercial license.

Licensing is flexible and supports:

* Enterprise support and maintenance
* Extended deployment rights
* Integration into proprietary systems
* Long-term updates and private features

---

## 🤝 Community Guidelines

* Contributions are welcome under a Contributor License Agreement (CLA)
* Respect user limits — we reserve the right to audit compliance
* We appreciate feedback and security reports via \[[security@m7.org](mailto:security@m7.org)]

---

## 📝 Summary

| Use Case                            | Allowed?      |
| ----------------------------------- | ------------- |
| Hobby / personal projects           | ✅ Yes         |
| Research or academic use            | ✅ Yes         |
| Internal team use (≤ 10 people)     | ✅ Yes         |
| SaaS / resale / commercial platform | ❌ License req |
| Internal use by >10 users           | ❌ License req |

---

This policy supplements the terms in `LICENSE.md` and helps clarify user expectations.


# --- end: docs/USE_POLICY.md ---



# --- begin: LICENSE.md ---

Moderate Team Source-Available License (MTL-10)

Version 1.0 – May 2025Copyright (c) 2025 m7.org

1. Purpose

This license allows use of the software for both non-commercial and limited commercial purposes by small to moderate-sized teams. It preserves freedom for individuals and small businesses, while reserving large-scale commercial rights to the Licensor.

2. Grant of Use

You are granted a non-exclusive, worldwide, royalty-free license to use, modify, and redistribute the Software, subject to the following terms:

You may use the Software for any purpose, including commercial purposes, only if your organization or team consists of no more than 10 total users of the Software.

A “user” is defined as any person who develops with, maintains, integrates, deploys, or operates the Software.

You may modify and redistribute the Software under the same terms, but must retain this license in all distributed copies.

3. Restrictions

If your organization exceeds 10 users of the Software, you must obtain a commercial license from the Licensor.

You may not offer the Software as a hosted service, software-as-a-service (SaaS), or part of a commercial product intended for resale or third-party consumption, regardless of team size.

You may not sublicense, relicense, or alter the terms of this license.

4. Attribution and Notices

You must include this license text and a copyright notice in all copies or substantial portions of the Software.

You must clearly indicate any modifications made to the original Software.

5. No Warranty

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY.

6. Contact for Commercial Licensing

If your use case exceeds the permitted team size, or involves resale, SaaS, hosting, or enterprise deployment:

📧 Contact: legal@m7.org

Commercial licensing is available and encouraged for qualified use cases.

# --- end: LICENSE.md ---



# --- begin: README.md ---

# M7BootStrap

M7BootStrap is a modular runtime package loading and mounting toolkit, designed to work across a wide range of applications.It provides a clean, extensible framework for resolving package dependencies, staging runtime assets and modules, and integrating them into a running system — with an emphasis on composability, clarity, and long-term maintainability.

Don’t waste cycles building loaders to load loaders.Let BootStrap handle dependency resolution, resource loading, and lifecycle wiring — so you can focus on the actual application logic.

✅ Version 1 Ready

M7BootStrap is now feature-complete for its 1.0 release, with detailed documentation and stable APIs.

The loader, dependency resolution, concurrency limiting, and lifecycle hooks are production-ready. Documentation now covers all major features, including granular data access and advanced load control.

---

## 🔧 Purpose

**M7BootStrap** is a runtime package management system for loading and unloading packages — including modules, assets, configuration files, and other runtime resources — while abstracting the complexity away from your project.  

It’s designed to support rapid development and deployment in environments where a static framework is impractical or inconvenient.  

Because it’s implemented entirely in JavaScript, it works with any backend and requires no special server-side setup.

---

## ⚡️ Features

* 📦 **Dynamic package loading & unloading** — handle assets, modules, and other resources at runtime.
* 🔗 **Dependency resolution** — automatically trace and load package dependencies in the correct order.
* ⚡ **Parallel fetching** — download packages and assets concurrently to minimize load times.
* 🔄 **Configurable lifecycle stages** — control boot, mount, start, and teardown phases.
* 🧩 **Modular mount/unmount handlers** — easily add or remove runtime components.
* 🗂️ **Runtime asset registry** — track and reference loaded resources without manual bookkeeping.
* 🌐 **Backend-agnostic** — works with any server or CDN; no special backend setup required.
* 📊 **Detailed load/fail report** — inspect results of every load operation.
* 🎯 **Granular success/failure handlers** — at global, package, repo, module, and asset levels.
* 🚦 **Per-scope concurrency limiting** — `limit`, `package.limit`, `repo.limit`, etc., for precise control.
* 🧮 **Rich data access layer** — via `bootstrap.data` (alias `bootstrap.packages.data`) with filtering helpers.

---


## 📦 Usage

Requires **[m7Fetch](https://github.com/linearblade/m7Fetch)** for HTTP/module loading.

---

### 📚 Full Guide
m7Bootstrap is relatively easy to use, however for advanced users there are a lot of options.
For complete usage examples, package schema details, handler resolution rules, and advanced integration patterns, see:

**[Full Usage Guide →](docs/usage/TOC.md)**

For detailed instructions and examples, please refer to the usage guide:

* **Installation** → [INSTALLATION.md](docs/usage/INSTALLATION.md)
* **Quick Start** → [QUICKSTART.md](docs/usage/QUICKSTART.md)
* **Example Library** → [EXAMPLES\_LIBRARY.md](docs/usage/EXAMPLES_LIBRARY.md)

---

## 💡 Use Cases

As a runtime package loader, **m7Bootstrap** excels in scenarios where flexibility, speed, and minimal setup are critical:

- **Website injection** —  
  Quickly run scripts or inject assets into someone else’s webpage without touching the server.  
  Great for testing, content experiments, or automating UI tweaks.  
  *(See [Example Library](docs/usage/EXAMPLES_LIBRARY.md) for DOM injection examples)*.

- **Custom browser extensions** —  
  Dynamically load resources or features on demand.  
  Chrome and other browsers may restrict this for app store–listed extensions, but if you’re sideloading or not publishing to a store, you can generally do whatever you want.  
  *(See [Installation](docs/usage/INSTALLATION.md) for setup details)*.

- **Rapid prototyping** —  
  Skip the boilerplate of heavier frameworks and focus on writing feature code.  
  Perfect for hackathons, proof-of-concepts, and small demos where time is critical.  
  *(See [Quick Start](docs/usage/QUICKSTART.md) for the minimal setup)*.

- **Game engines** —  
  Load and unload scenes, UI layers, or even full engine modules on demand.  
  Ideal for DOM-driven game engines or hybrid HTML5/WebGL projects.  
  *(See [Example Library](docs/usage/EXAMPLES_LIBRARY.md) for asset and module loading patterns)*.

- **Single-page applications (SPAs)** —  
  Dynamically load new features, pages, or dependencies without a full page reload.  
  Works well alongside existing frameworks or vanilla JS routing.

- **Internal tools & dashboards** —  
  Load widgets, analytics panels, or feature modules on demand without redeploying the entire dashboard.

- **A/B testing & feature flags** —  
  Swap UI or logic modules dynamically for experiments without full redeploys.

- **Legacy system augmentation** —  
  Add modern JavaScript modules to older, server-rendered apps without touching backend code.

- **Client demo environments** —  
  Pull packages from a staging repo for “live” previews without maintaining a full build.

- **Offline-first scenarios** —  
  Cache packages locally for offline use and update them selectively when online.

- **Resource-restricted environments** —  
  Since **m7Bootstrap** requires no particular backend, it’s extremely easy to set up inside environments that typically demand a dedicated server or heavy backend to serve specialized content.  
  This makes it a good fit for projects built with frameworks that normally require Node, Angular, or similar stacks.

- **Micro-frontend orchestration** —  
  Dynamically load and swap independent frontend modules at runtime, enabling teams to work in isolation and deploy updates independently without rebuilding the entire app.  
  Particularly useful in large-scale applications where different parts of the UI are maintained by separate teams.

- **Live plugin systems** —  
  Enable, disable, or swap plugins while the application is running without a page refresh.  
  Perfect for extensible platforms, CMS-like systems, or apps with user-selectable feature sets.

Once your package stack is complete, you can inline it or bundle it into a single package for faster load times.

---

⚡ Status

Version 1.0 is production ready. The core lifecycle phases — package schema loading, asset loading, module loading, and mounting — are stable and well-documented.

Advanced features like per-scope concurrency limits, granular success/fail handlers, and detailed load reports are included.

Dependency-aware ordering is still parallelized for performance, so hooks should be used for integration points where sequence matters.

---

## 📜 License

See [`LICENSE.md`](LICENSE.md) for full terms.  
Free for personal, non-commercial use.  
Commercial licensing available under the M7 Moderate Team License (MTL-10).

## 💼 **Integration & Support**

If you’re interested in using M7BootStrap in a commercial project or need assistance with integration,  
support contracts and consulting are available. Contact [legal@m7.org](mailto:legal@m7.org) for details.

---

## 🤖 AI Usage Disclosure

See [`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md) and [`docs/USE_POLICY.md`](docs/USE_POLICY.md)  
for permitted use of AI in derivative tools or automation layers.

---

## 🛠️ Philosophy

> “Initialize only what you mean to use.”  
> BootStrap avoids premature assumptions and allows precise control over app lifecycle stages.

---

## 💬 Feedback / Security

- General inquiries: [legal@m7.org](mailto:legal@m7.org)  
- Security issues: [security@m7.org](mailto:security@m7.org)


# --- end: README.md ---



# --- begin: TODO.md ---

this is my scratch pad. you can look at it or whatever. its much faster than jumping in and out of jira

[x] net.batch requires concurrency limiting implemented. (more of a m7Fetch thing but still the same shit list.)
[x] full granularity on handlers where it matters , package , module and asset loads
[x] mount / unmount : either overload the function parameters or split the functions for api wrapper. this could be done via #mount and #unmount instead of #mount.load and mount.unload,
[x] mount / unmount : pkg level mount / unmount
[x] standardize and double check all ctx values on _runHandlers
[x] probably a final pass on documentation for this version
[x] get the files uploaded into the package, and push live.
[x] logging. // basically solved with the reports
[x] investigate libfuncget incase window is an issue for npm
[x] mount load on same target seems to delete the document body

(note that reports or other 'asyncronous items' may output inconsistently in teh console, b/c they are references) if you want to debug them convert the relevant data to json and then console.log/error whatever it.)
(reports are custom to the type of action. Repo -> RepoLoadReport, module -> ModuleLoadReport, etc)

repo
-no access to package local functions for '~function'
itemload, itemerror : node,def,report (on error, def will be nullish)
load/error : input,output, report


asset loader
-may have access to package local functions for '~function' notation. unreliable due to load order. not reccomended for use
-itemload/itemerror : {pkg, asset,id,batch,report}, (report will likely be partially filled out, b/c this is a per item call, and not yet finished. may have useful debugging information)
   -batch is the batch handler object, can inspect batch.controller for details of progress. will not likely be filled out fully either due to asyncronous requests not yet complete)
   - asset is the asset that triggered this information (package asset entry)
-load/error         : {pkg, sync,batchResults,report}
  - sync is the syncloader object created for the net.batch.run request.
  - batchresults is the output of the completed net.batch.run request. 


module loader
-modules have moderate access to package local functionality for '~function' , however if a load fails, then obviously that module wil not be available.
-as usual, report may or may not be fully filled out on per item requests, b/c the report may not yet be complete.
-itemload/itemerror : {pkg,report,module } module is the current module item being processed.
   -module record format: 
   - .then((mod) => ({ status: 'fulfilled', id: fullID, mod }))
     .catch((err) => ({ status: 'rejected',  id: fullID, err }));
-load/error         : {pkg, report }

packageloader 
-full access to pkg local notation '~function'
-hooks will only run if enabled and module loading is successful.
-hooks/load/error : {pkg,report}

bootstrap
-no access to pkg local notation, this is the top level package loader, and no particular package is selected here
{  report,  options,   err } // options are the load level options passed in from bootstrap.load, err are errors, but may also be retrieved from the individual reports






# --- end: TODO.md ---

