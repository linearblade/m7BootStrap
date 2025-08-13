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
