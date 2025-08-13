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
  "#runner.mount",
  (sys, ctx) => integrateDependencies(sys,ctx)
];

await bootstrap.load(resources, {load:onLoad});
```

---

## 2. Concurrency Limits

By default, bootstrap keeps a internal limiter of 8 simultaneous processes per component (repo,module,assets, packages). However a large package list will be queued up at once , as will a large list of assets,etc.

If you are loading many large packages at once, unbounded parallelism may cause:

* Network congestion
* Memory spikes
* API rate limiting (for authenticated sources)

Consider breaking up very large packages into smaller components, and use a concurrency limiter for controlled parallelism:

```js
import { createLimiter } from ".<path_to_bootstrap>/utils/limiter.js";

const limit = createLimiter(8); // max 8 concurrent requests
await Promise.all(resources.map(r => limit(() => bootstrap.load([r]))));
```

Or use built in parallelism (assuming the package size itself is not too large):
```js
bootstrap.load(resources, {limit:8,load,error});
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
