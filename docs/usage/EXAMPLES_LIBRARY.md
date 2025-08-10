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
