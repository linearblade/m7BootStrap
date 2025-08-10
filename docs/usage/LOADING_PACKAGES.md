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

| Name      | Type                        | Description                                                                           |
| --------- | --------------------------- | ------------------------------------------------------------------------------------- |
| resources | string \| object \| array   | One or more packageResource inputs — see **Package Specifications**                   |
| onLoad    | function \| string \| array | Handler(s) to run on success. Can be functions, method refs, or symbolic module refs. |
| onFail    | function \| string \| array | Handler(s) to run on failure (same formats as `onLoad`).                              |
| options   | object *(optional)*         | Loader configuration (see below).                                                     |

---

## Options

Options are passed as the fourth argument:

```js
{
  package: {
    hooks: true  // Run each package's `run` hooks after load (default: true)
  }
}
```

---

## Resource Forms

`resources` can be:

1. **Symbolic string** — `"scene:chess"`
2. **Repo-wrapped** — `{ resource: "scene:chess", repo: ["/repo"] }`
3. **Inline package** — `{ resource: { id: "...", assets: [...], modules: [...] } }`

See **Package & Repo Specifications** for full format details.

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
* **Local bootstrap method** — `"#mount.load"`

See **Hooks & Handlers** for full details.

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

---

**Related Topics:**

* **Package & Repo Specifications**
* **Hooks & Handlers**
* **Unmounting Packages**
