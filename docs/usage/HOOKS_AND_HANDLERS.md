← Back to [Usage Guide Index](TOC.md)

# 🔗 Hooks & Handlers

Hooks and handlers let you inject custom logic into the package lifecycle.
They run **after packages load or fail** and can be used to mount assets, integrate modules, trigger UI changes, or clean up resources.

> **Tip — Automated Mounter:** When **loading**, include `"#runner.mount"` in your `onLoad` handlers to auto‑mount HTML assets. When **unloading**, include `"#runner.unmount"` in `onDone` to unmount. These are bootstrapper-local methods intended for mounting/teardown.

---

## Handler Types

A handler can be **any** of the following:

| Type                          | Example                                       | Description                                                                                                                                                 |
| ----------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Function**                  | `(sys, ctx) => { console.log(ctx.results); }` | Direct function callback with system and context args.                                                                                                      |
| **Global function name**      | `"myGlobalFn"`                                | Resolved from the global scope.                                                                                                                             |
| **Symbolic module reference** | `"@pkg.module.fn"`                            | Calls the `fn` export of `pkg.module` from a loaded package.                                                                                                |
| **Package‑local reference**   | `"~module.fn"`, `"~fn"`                       | Valid **only during that package's load phase**; resolves within the loading package. Not valid for general `onLoad`/`onError` that run after all packages. |
| **Local bootstrap method**    | `"#runner.mount"`, `"#runner.unmount"`            | Calls a method on the current `BootStrap` instance. (Argument passing not supported.)                                                                       |
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
* `#` — **Bootstrapper‑local** method, e.g. `"#runner.mount"`, `"#runner.unmount"`.
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
const onLoad  = ["#runner.mount", "@ui.notify.loaded", (sys, ctx) => console.log("Loaded:", ctx.results)];
const onError = ["jobFail", (sys, ctx) => console.warn("Failed:", ctx.failed)];

await bootstrap.load(resources, onLoad, onError);
```

> **Note:** Because `~` package‑local references only resolve during the specific package’s load phase, avoid using them in global `onLoad` arrays that execute after all packages complete.

---

## Multiple Handlers

You can provide arrays of handlers — they will run in order:

```js
const onLoad = [
  "#runner.mount",
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
  ["#runner.unmount"],        // onDone handlers (unmount assets via automated mounter)
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
* Include `"#runner.mount"`/`"#runner.unmount"` if you want the automated mounter to mount/unmount assets.
* Remember: your `options` object is passed to handlers as `ctx.options`; you can namespace custom data there (e.g., `options.ui`, `options.telemetry`).

---

**Related Topics:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Mounting & Unmounting Packages](MOUNTING.md)**
* **[Package & Repo Specifications → functionResourceObject](PACKAGE_SPECIFICATIONS.md#functionresourceobject)**
