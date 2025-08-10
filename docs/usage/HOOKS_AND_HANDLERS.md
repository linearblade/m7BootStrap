← Back to [Usage Guide Index](TOC.md)

# 🔗 Hooks & Handlers

Hooks and handlers let you inject custom logic into the package lifecycle.
They run **after packages load or fail** and can be used to mount assets, integrate modules, trigger UI changes, or clean up resources.

---

## Handler Types

A handler can be **any** of the following:

| Type                          | Example                                       | Description                                            |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| **Function**                  | `(sys, ctx) => { console.log(ctx.results); }` | Direct function callback with system and context args. |
| **Global function name**      | `"myGlobalFn"`                                | Resolved from the global scope.                        |
| **Symbolic module reference** | `"@pkg.module.fn"`                            | Calls the `fn` export of `pkg.module` if it’s loaded.  |
| **Local bootstrap method**    | `"#mount.load"`                               | Calls a method on the current `BootStrap` instance.    |

---

## Context Object

Handlers always receive `(sys, ctx)` arguments:

* **`sys`** — The calling system instance (e.g., `bootstrap`)
* **`ctx`** — An object with fields:

| Field     | Type   | Description                                     |
| --------- | ------ | ----------------------------------------------- |
| `results` | array  | Successfully loaded package definitions         |
| `failed`  | object | The package that failed (if any)                |
| `options` | object | Loader options passed to `load()`               |
| `err`     | Error  | Error object if failure was due to an exception |

---

## Attaching Handlers

You attach handlers when calling `.load()` or `.unload()`:

```js
const onLoad  = ["#mount.load", (sys, ctx) => console.log("Loaded:", ctx.results)];
const onError = ["jobFail", (sys, ctx) => console.warn("Failed:", ctx.failed)];

await bootstrap.load(resources, onLoad, onError);
```

---

## Multiple Handlers

You can provide arrays of handlers — they will run in order:

```js
const onLoad = [
  "#mount.load",
  "@ui.notify.loadComplete",
  (sys, ctx) => { console.log("Custom post-load", ctx); }
];
```

---

## Using Handlers with Unload

The same system applies for `.unload()`:

```js
await bootstrap.unload(
  ["scene:chess"],          // packages to unload
  ["#mount.unload"],        // onDone handlers
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

* Keep handlers small — complex operations should delegate to dedicated modules.
* Use symbolic refs for modules so they’re automatically resolved from loaded packages.
* Avoid hard-coded package IDs unless the package is guaranteed to be present.
* Leverage post-load hooks to integrate with your app without blocking parallel loading.

---

**Related Topics:**

* **Loading Packages**
* **Unmounting Packages**
