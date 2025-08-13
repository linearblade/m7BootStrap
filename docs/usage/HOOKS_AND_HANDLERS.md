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
