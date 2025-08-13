# M7BootStrap

**M7BootStrap** is a modular runtime package loading and mounting toolkit, designed to work across a wide range of applications.  
It provides a clean, extensible framework for resolving package dependencies, staging runtime assets and modules, and integrating them into a running system — with an emphasis on composability, clarity, and long-term maintainability.

> Don’t waste cycles building loaders to load loaders.  
> Let BootStrap handle dependency resolution, resource loading, and lifecycle wiring — so you can focus on the actual application logic.

⚠️ **Warning: Documentation Incomplete**
> 
> This project is currently under active development, and documentation is still being written.
> Some features may be undocumented or subject to change.  
> Please check back soon as we continue to update this repository.

---

## 🔧 Purpose

**M7BootStrap** is a runtime package management system for loading and unloading packages — including modules, assets, configuration files, and other runtime resources — while abstracting the complexity away from your project.  

It’s designed to support rapid development and deployment in environments where a static framework is impractical or inconvenient.  

Because it’s implemented entirely in JavaScript, it works with any backend and requires no special server-side setup.

---

## ⚡️ Features

- 📦 **Dynamic package loading & unloading** — handle assets, modules, and other resources at runtime.
- 🔗 **Dependency resolution** — automatically trace and load package dependencies in the correct order.
- ⚡ **Parallel fetching** — download packages and assets concurrently to minimize load times.
- 🔄 **Configurable lifecycle stages** — control boot, mount, start, and teardown phases.
- 🧩 **Modular mount/unmount handlers** — easily add or remove runtime components.
- 🗂️ **Runtime asset registry** — track and reference loaded resources without manual bookkeeping.
- 🌐 **Backend-agnostic** — works with any server or CDN; no special backend setup required.

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

## 🚧 Status

This project is **under active development** but is production ready, with a few caveats:

* **Parallel loading** means dependencies are not installed in dependency-order.

  This is done for performance reasons; as a runtime loader, prioritizing fast retrieval of assets — including both modules and other resources — takes precedence over loading them in strict dependency order.

  You should wait until *all* packages finish loading, then integrate them into your application as needed.
  For example:

  ```js
  const success = await scenes.bootstrap.load(resourceList, onLoad, onError, {
    package: { hooks: true }
  });

  // onLoad handler
  ["#mount.load", "copy_modules_from_bootstrap_to_final_location"]
  ```

  HTML assets will mount automatically, but if you want to move modules or assets to custom locations, handle that in your post-load hook.

* **Unmounting works correctly** — packages will be unmounted and modules cleared from the bootstrapper — but if you copied those modules elsewhere, you are responsible for removing them from that location.

* **Modules can run in place** — there’s no technical reason they must be relocated. Moving them is purely for organizational or “clean workspace” reasons.

* **Run/error hooks are currently broad** — you’ll know if something failed, but fine-grained context may require checking the console logs.

Core lifecycle phases — package schema loading, asset loading, module loading, and mounting — are stable.
Future updates will improve dependency-aware loading, hook granularity, and diagnostics.

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
← Back to [Usage Guide Index](TOC.md)

# 🚀 Advanced Usage

This section covers techniques for customizing **M7BootStrap** beyond the basics — from parallelizing loads to integrating with external systems.

---

## 1. Parallel Package Loading

**M7BootStrap** automatically resolves dependencies before loading, but package loading itself can be parallelized for speed.

```js
import { createLimiter } from "./utils/limiter.js";

const limit = createLimiter(8); // 8 concurrent loads

await Promise.all(
  resources.map(res => limit(() => bootstrap.load([res])))
);
```
bootstrap.load ALSO provides for built in concurrency limiting
```
bootstrap.load(resources,onload,onerror, {limit:8})
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
  "#mount.load",
  (sys, ctx) => {

    ctx.results.forEach(pkg => {
      if (pkg.modules.gameLogic) {
        attachToGame(pkg.modules.gameLogic);
      }
    });
  }
];

await bootstrap.load(resources, onLoad);
```

---

## 6. Loading Without Hooks

If you want full manual control:

```js
const results = await bootstrap.load(resources, null, null, {
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

await bootstrap.load(["scene:3dworld"], onLoad);
```

---

**Related Topics:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
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
- A bound method reference (`"#mount.load"`, "~module.start", "@pkg:module.start","something_in_global_namespace").


---

## 7. Why Parallel Loading?

Parallel loading maximizes performance, especially when packages include large assets or multiple dependencies.  
Since dependencies are resolved *after* everything loads, you have full control over how and when to integrate them.

---

## Next Steps

Continue to [Quick Start](QUICK_START.md) to see M7BootStrap in action with a minimal example.← Back to [Usage Guide Index](TOC.md)

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

* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)** — Learn how to define resources for loading.
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)** — See how to attach logic at various stages.
* **[Mounting & Unmounting Packages](MOUNTING.md)** — Safely remove packages and clean up assets/modules.
* Continue to **[Loading Packages](LOADING_PACKAGES.md)** for information on loading packages.← Back to [Usage Guide Index](TOC.md)

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
  (sys, ctx) => console.log("Loaded:", ctx),
  (sys, ctx) => console.error("Error:", ctx)
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

await bootstrap.load([inlinePkg], onLoad, onError);
```

---

## 3. Custom Post-Load Handling

```js
const onLoad = [
  "#mount.load", // built-in DOM/asset mount
  (sys, ctx) => {
    console.log("All packages loaded. Moving modules to final location.");
    moveModules(sys.modules);
  }
];

const onError = [
  (sys, ctx) => console.error(`Failed to load:`  ctx)
];

await bootstrap.load(resources, onLoad, onError);
```

---

## 4. Unloading Packages

```js
await bootstrap.unload(
  ["scene:chess"],
  ["#mount.unload", cleanupModules],
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

await bootstrap.load(resources, onLoad, onError);
```

---

## 6. Using Symbolic Resource Names

```js
const resources = [
  "@resources.chessScene",
  "@resources.hamsterUtils"
];

await bootstrap.load(resources, "#mount.load", "globally_scoped_function");
```

---

## 7. Mixed Package Types

```js
const resources = [
  "scene:chess",                               // plain symbolic
  { resource: "utils:hamsters", repo: ["/r"] }, // with repo
  { resource: inlinePkg }                       // inline
];

await bootstrap.load(resources, onLoad, onError);
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
* A local bootstrapper-bound method (`"#mount.load"`)

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
← Back to [Usage Guide Index](TOC.md)

# 🔗 Hooks & Handlers

Hooks and handlers let you inject custom logic into the package lifecycle.
They run **after packages load or fail** and can be used to mount assets, integrate modules, trigger UI changes, or clean up resources.

> **Tip — Automated Mounter:** When **loading**, include `"#mount.load"` in your `onLoad` handlers to auto‑mount HTML assets. When **unloading**, include `"#mount.unload"` in `onDone` to unmount. These are bootstrapper-local methods intended for mounting/teardown.

---

## Handler Types

A handler can be **any** of the following:

| Type                          | Example                                       | Description                                                                                                                                                 |
| ----------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Function**                  | `(sys, ctx) => { console.log(ctx.results); }` | Direct function callback with system and context args.                                                                                                      |
| **Global function name**      | `"myGlobalFn"`                                | Resolved from the global scope.                                                                                                                             |
| **Symbolic module reference** | `"@pkg.module.fn"`                            | Calls the `fn` export of `pkg.module` from a loaded package.                                                                                                |
| **Package‑local reference**   | `"~module.fn"`, `"~fn"`                       | Valid **only during that package's load phase**; resolves within the loading package. Not valid for general `onLoad`/`onError` that run after all packages. |
| **Local bootstrap method**    | `"#mount.load"`, `"#mount.unload"`            | Calls a method on the current `BootStrap` instance. (Argument passing not supported.)                                                                       |
| **functionResourceObject**    | `{ fn: "@pkg.module.fn", bind: true }`        | Structured form that normalizes any handler input; see **Function Resource Objects** below.                                                                 |

---

## Context Object

Handlers always receive `(sys, ctx)` arguments:

* **`sys`** — The calling system instance (e.g., `bootstrap`)
* **`ctx`** — An object with fields:

| Field     | Type   | Description                                                                                           |
| --------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `results` | array  | Successfully loaded/unloaded package definitions                                                      |
| `failed`  | object | The package that failed (if any)                                                                      |
| `options` | object | The full options object passed to `load()`/`unload()` (you may define your own namespace inside here) |
| `err`     | Error  | Error object if failure was due to an exception                                                       |

---

## Function Resource Objects

Handlers passed to `load()`/`unload()` can be strings, functions, or structured objects. Internally, they are normalized into a **functionResourceObject** so the runtime can process them consistently.

**What it is:** a normalized object with at least `{ fn, bind, original }`, and flags for how the reference should be resolved.

**Prefixes & meaning:**

* `@` — **Symbolic module reference** in a loaded package, e.g. `"@ui.toast.show"` → `ui.toast.show` export.
* `~` — **Package‑local** reference (valid only during that package’s load phase), e.g. `"~setup"`, `"~module.init"`.
* `#` — **Bootstrapper‑local** method, e.g. `"#mount.load"`, `"#mount.unload"`.
* *(none)* — Global function name or direct function reference.

**Examples (conceptual):**

```js
"@foo.bar"           // → { fn: "foo.bar", symbolic: true, bind: false, original: "@foo.bar" }
"myFunc"             // → { fn: "myFunc", symbolic: false, bind: false, original: "myFunc" }
() => {}              // → { fn: [Function], bind: false, original: "anonymous" }
{ fn: "@pkg.fn", bind: true }
// → { fn: "pkg.fn", symbolic: true, bind: true, original: "@pkg.fn" }
```

See [`functionResourceObject`](PACKAGE_SPECIFICATIONS.md#functionresourceobject). for the full schema and normalization rules.

---

## Attaching Handlers

Attach handlers when calling `.load()` or `.unload()`:

```js
const onLoad  = ["#mount.load", "@ui.notify.loaded", (sys, ctx) => console.log("Loaded:", ctx.results)];
const onError = ["jobFail", (sys, ctx) => console.warn("Failed:", ctx.failed)];

await bootstrap.load(resources, onLoad, onError);
```

> **Note:** Because `~` package‑local references only resolve during the specific package’s load phase, avoid using them in global `onLoad` arrays that execute after all packages complete.

---

## Multiple Handlers

You can provide arrays of handlers — they will run in order:

```js
const onLoad = [
  "#mount.load",
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
  ["#mount.unload"],        // onDone handlers (unmount assets via automated mounter)
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
* Use `~` only for **package‑local load‑time hooks**; avoid in global `onLoad`.
* Include `"#mount.load"`/`"#mount.unload"` if you want the automated mounter to mount/unmount assets.
* Remember: your `options` object is passed to handlers as `ctx.options`; you can namespace custom data there (e.g., `options.ui`, `options.telemetry`).

---

**Related Topics:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Mounting & Unmounting Packages](MOUNTING.md)**
* **[Package & Repo Specifications → functionResourceObject](PACKAGE_SPECIFICATIONS.md#functionresourceobject)**
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
  (sys, ctx) => console.log("Loaded:", ctx),
  (sys, ctx) => console.warn("Failed:", ctx)
);

console.log("Boot status:", ok);
```

If you see `Loaded:` \[...] in the console, your installation is working.

---

## Next Steps

Continue to **[Basic Concepts](BASIC_CONCEPTS.md)** to learn the core ideas behind packages, repos, and handlers.
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

Once you’ve reviewed the requirements, proceed to [Installation](INSTALLATION.md) for setup instructions.← Back to [Usage Guide Index](TOC.md)

# 📦 Loading Packages

The `load()` method is the primary way to bring packages, modules, and assets into your runtime environment.
It handles dependency resolution, parallel downloading, and lifecycle hooks.

---

## Syntax

```js
const ok = await bootstrap.load(resources, onLoad?, onFail?, options?);
```

**Parameters:**

| Name      | Type                                  | Description                                                                                               |
| --------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| resources | string \| object \| array             | One or more `packageResource` inputs — see **Package Specifications**                                     |
| onLoad    | function \| string \| array \| object | Handler(s) to run on success. Can be functions, method refs, symbolic refs, or `functionResourceObject`s. |
| onFail    | function \| string \| array \| object | Handler(s) to run on failure (same formats as `onLoad`).                                                  |
| options   | object *(optional)*                   | Loader configuration (see below).                                                                         |

---

## Options

Options are passed as the fourth argument to `load()`. All provided options are also passed to any handlers executed, and can be accessed inside the `ctx` variable. You may define your own namespace within the `options` object for this purpose.

```js
{
  hooks: true,
  limit: 8, // max concurrent requests (default 8)

  repo: { // repo options
    circuitbreaker: 100, // max dependency lookups before abort (default 100)
    limit: 8              // concurrency for repo fetches (default: parent `limit` or 8)
  },

  package: { // package load options
    // Only `hooks` is used at present (exposed at top-level for convenience).
    // Reserved for future package-level options.
  },

  assets: {
    limit: 8 // concurrency for asset fetches (default: parent `limit` or 8)
  }
}
```

**Fields**

| Path                  | Type    | Default | Notes                                                                                        |
| --------------------- | ------- | ------- | -------------------------------------------------------------------------------------------- |
| `hooks`               | boolean | `true`  | Run each package’s `run` hooks after load. Exposed at top level for convenience.             |
| `limit`               | integer | `8`     | Global concurrency cap for parallel loads.                                                   |
| `repo.circuitbreaker` | integer | `100`   | Safety cutoff for runaway or circular dependency traversal.                                  |
| `repo.limit`          | integer | `limit` | Concurrency limit for repo requests; falls back to the parent `limit`.                       |
| `package`             | object  | `{}`    | Reserved for future package-specific options. Currently unused beyond the top-level `hooks`. |
| `assets.limit`        | integer | `limit` | Concurrency limit for asset fetches; falls back to the parent `limit`.                       |

---

## Resource Forms

`resources` can be:

1. **Symbolic string** — `"scene:chess"`
2. **Repo-wrapped** — `{ resource: "scene:chess", repo: ["/repo"] }`
3. **Inline package** — `{ resource: { id: "...", assets: [...], modules: [...] } }`

See **Package & Repo Specifications** for full format details.

---

## Function Resource Arguments in Handlers

The `onLoad` and `onFail` parameters accept **function resource arguments**, which are normalized into [`functionResourceObject`](PACKAGE_SPECIFICATIONS.md#functionresourceobject) form.

A function resource argument can be:

* A direct function reference
* A string reference:

  * `"@pkg.module.fn"` → symbolic reference to a function inside a loaded package
  * `"~module.fn"` or `"~fn"` → package-local reference (only valid during that package's load phase)
  * `"#mount.load"` → bootstrapper-local method reference (no arguments supported)
  * `"myFunction"` → global function name
* An object with at least `{ fn: ... }`, plus optional `bind`, `symbolic`, `local`, `pkgLocal` flags, and any extra metadata.

**Example:**

```js
const onLoad = [
  "#mount.load",
  "@resources.ui.init",
  { fn: "~module.setup", bind: true, extra: "meta-info" }
];
```

See **Hooks & Handlers** for handler execution details.

---

## Example — Basic Load

```js
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

const net = new Net();
const bootstrap = new BootStrap(net);

const resources = [
  { resource: "scene:chess", repo: ["/repo"] },
  "@resources.allpurposemounter"
];

const onLoad = ["#mount.load", (sys, ctx) => console.log("Loaded:", ctx.results)];
const onError = [(sys, ctx) => console.error("Failed:", ctx.failed)];

const ok = await bootstrap.load(resources, onLoad, onError, {
  package: { hooks: true }
});

if (!ok) {
  console.error("One or more packages failed to load");
}
```

---

## Dependency Resolution

When you call `load()`:

1. Dependency graph is built via `buildDependencyGraph()`.
2. All required packages (including transitive dependencies) are added to the load queue.
3. Downloads happen in parallel for performance.
4. Packages are mounted once all resources are retrieved.

> **Note:** Because loading is parallel, you should not assume strict dependency order execution.
> Wait for `onLoad` to fire before integrating modules into your app.

---

## Hooks & Handlers

Handlers can be:

* **Function** — `(sys, ctx) => { ... }`
* **Global function name** — `"myFunction"`
* **Symbolic module ref** — `"@pkg.module.fn"`
* **Package-local ref** — `"~module.fn"` or `"~fn"` (valid only during that package's load phase)
* **Local bootstrap method** — `"#mount.load"`
* **functionResourceObject** — see **Package & Repo Specifications**

---

## Common Patterns

### Loading from Multiple Repos

```js
const resources = [
  {
    resource: "scene:chess",
    repo: ["/primary-repo", "/backup-repo"]
  }
];
await bootstrap.load(resources);
```

### Inline Packages

```js
await bootstrap.load({
  resource: {
    id: "allpurposemounter",
    assets: [ { id: "mountinstructions", inline: true, content: { a: "b" } } ],
    modules: [],
    run: ["mountusMaximus"]
  }
});
```

### Symbolic Resources

Symbolic strings like `"scene:chess"` are resolved through your repo configuration and network layer.

## Unload

The `unload()` method removes one or more packages by ID or definition.

```ts
async unload(
  resources: string | object | Array<string | object>,
  onDone?: Function | Function[] | string | string[] | object | object[] | null,
  onError?: Function | Function[] | string | string[] | object | object[] | null,
  options?: {
    ignoreMissing?: boolean,
    cascade?: boolean,
    keepAssets?: boolean,
    keepModules?: boolean,
    // ...custom
  }
): Promise<boolean>
```

**Options**

| Option          | Type    | Default | Status          | Description                                              |
| --------------- | ------- | ------- | --------------- | -------------------------------------------------------- |
| `ignoreMissing` | boolean | `true`  | *unimplemented* | Ignore missing packages and continue.                    |
| `cascade`       | boolean | `false` | *unimplemented* | Remove dependencies as well as the specified packages.   |
| `keepAssets`    | boolean | `false` | implemented     | Keep assets mounted/registered instead of removing them. |
| `keepModules`   | boolean | `false` | implemented     | Keep modules registered instead of clearing them.        |

> If you wish to unmount assets, include `"#mount.unload"` in the `onDone` handler list (as a `functionResourceObject`).

As with `load()`, all provided `options` are also passed to any handlers executed, and can be accessed inside the `ctx` variable.

---

**Related Topics:**

* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* **[Mounting & Unmounting Packages](MOUNTING.md)**
← Back to [Usage Guide Index](TOC.md)

# 🧰 Mounting and unmounting assets

Mounting is **not the same** as loading. *Loading/unloading* retrieves packages, resolves dependencies, and manages module/asset registries. *Mounting/unmounting* injects or removes concrete DOM elements described by package **mount assets**.

> The Mount Manager consumes assets of type **`mount`** (JSON configs), injects their DOM nodes, and tracks them so corresponding **unmount** calls can cleanly remove them. It works via the `#mount.load` / `#mount.unload` handlers you attach to `load()` / `unload()`.

---

## When to Use

* **During load:** call `#mount.load` in your `onLoad` handlers to auto‑inject HTML/DOM assets.
* **During unload:** call `#mount.unload` in `onDone` to remove previously injected nodes.
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

### `#mount.load`

Mount all eligible `type:"mount"` assets.

* **Default behavior:** inject all `mount` assets for the relevant packages.
* **Tracking:** nodes are recorded in the DOM registry under their **package group** for later removal.

### `#mount.unload`

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
    { fn: "#mount.load" } // handler sees ctx.options.mount.packages
  ],
  null,
  {
    mount: { packages: ["scene:chess", "allpurposemounter"] }
  }
);

await bootstrap.unload(
  ["scene:chess"],
  [ { fn: "#mount.unload" } ],
  null,
  { mount: { packages: ["scene:chess"] } }
);
```

### 2) Via functionResourceObject args (planned direct args)

If/when `#mount.*` accepts inline args on the handler:

```js
const onLoad = [
  { fn: "#mount.load", args: { packages: ["scene:chess"] } }
];

const onDone = [
  { fn: "#mount.unload", args: { packages: ["scene:chess"] } }
];
```

Both approaches result in **per‑package** injection/teardown rather than global effects.

---

## Usage Examples

### Mount during Load

```js
const onLoad = ["#mount.load"]; // auto‑inject mount assets from loaded packages
await bootstrap.load(resources, onLoad, ["jobFail"], {
  hooks: true,
  mount: { packages: ["scene:chess"] } // optional narrowing
});
```

### Unmount during Unload

```js
await bootstrap.unload(
  ["scene:chess"],
  ["#mount.unload"],    // remove nodes injected for this package
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

* **[Loading Packages](LOADING_PACKAGES.md)** — attach `#mount.load` in `onLoad`
* **[Mounting & Unmounting Packages](MOUNTING.md)** — attach `#mount.unload` in `onDone`
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)** — handler forms & `functionResourceObject`
* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)** — asset definitions & function resource objects
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
  "#mount.load",
  (sys, ctx) => integrateDependencies(sys,ctx)
];

await bootstrap.load(resources, onLoad);
```

---

## 2. Concurrency Limits

If you are loading many large packages at once, unbounded parallelism may cause:

* Network congestion
* Memory spikes
* API rate limiting (for authenticated sources)

Use a concurrency limiter for controlled parallelism:

```js
import { createLimiter } from "./utils/limiter.js";

const limit = createLimiter(8); // max 8 concurrent requests
await Promise.all(resources.map(r => limit(() => bootstrap.load([r]))));
```

Or use built in parallelism:
```js
bootstrap.load(resources, onload,onerror, {limit:8});
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
  "#mount.load", // symbolic reference to a bootstrapper method
  (sys, ctx) => console.log("Loaded packages:", ctx)
];

const onError = [
  "logFailure",
  (sys, ctx) => console.warn("Failed to load:", ctx)
];

// Load the package(s)
const success = await bootstrap.load(resources, onLoad, onError, opts);

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
  ["#mount.unload"],      // onDone handlers
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
* Continue to **[Core API Overview](CORE_API_OVERVIEW.md)** to learn the primary methods exposed for use← Back to [README](../../README.md)

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

## 10. [Advanced Usage](ADVANCED_USAGE.md)

## 11. [Performance Considerations](PERFORMANCE.md)

## 12. [Troubleshooting](TROUBLESHOOTING.md)

## 13. [Examples Library](EXAMPLES_LIBRARY.md)

## 14. [Glossary](GLOSSARY.md)
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
  const success = await bootstrap.load(resources, onLoad, onError);
  if (success) {
    integrateAllPackages();
  }
  ```
* Or handle order manually in `onLoad`.

---

## 3. Hooks Not Triggering

*Symptoms:**

* `onLoad` or `onError` handlers do not run.

**Causes:**

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
  * `#mount.load` or `#mount.unload` — Calls bootstrapper methods, primarily for mounting/unmounting operations (no argument support currently).
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
    ["#mount.unload", cleanupCustomModules]
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
← Back to [Usage Guide Index](TOC.md)

# 🗑️ Unmounting Packages

Unmounting removes packages from the runtime, clears associated modules, and can optionally clean up assets or run teardown handlers.

---

## Basic Usage

Call `.unload()` on your `BootStrap` instance:

```js
await bootstrap.unload(
  ["scene:chess"],          // packages to unload
  ["#mount.unload"],        // onDone handlers
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
await bootstrap.load(resources, ["#mount.load"]);

// Later, unload
await bootstrap.unload(
  ["scene:chess", "allpurposemounter"],
  ["#mount.unload"],
  ["jobFail"],
  { ignoreMissing: true }
);
```

---

**Related Topics:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
