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
    hooks: {packageLoad: ["mountusMaximus"]} 
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
