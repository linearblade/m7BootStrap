← Back to [Usage Guide Index](TOC.md)

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
