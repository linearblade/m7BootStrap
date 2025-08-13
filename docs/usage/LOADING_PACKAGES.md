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
  * `"#mount.load"` → bootstrapper-local method reference
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
  load: ["#mount.load", (sys, ctx) => console.log("Loaded:", ctx.results)],
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
* Bootstrap method — `"#mount.load"`
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

> To unmount assets, include `"#mount.unload"` in `onDone`.

---

**Related Topics:**

* [Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)
* [Hooks & Handlers](HOOKS_AND_HANDLERS.md)
* [Mounting & Unmounting Packages](MOUNTING.md)
