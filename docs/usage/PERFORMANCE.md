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
  "#mount.load",
  (sys, ctx) => integrateDependencies(sys,ctx)
];

await bootstrap.load(resources, onLoad);
```

---

## 2. Concurrency Limits

If you are loading many large packages at once, unbounded parallelism may cause:

* Network congestion
* Memory spikes
* API rate limiting (for authenticated sources)

Use a concurrency limiter for controlled parallelism:

```js
import { createLimiter } from "./utils/limiter.js";

const limit = createLimiter(8); // max 8 concurrent requests
await Promise.all(resources.map(r => limit(() => bootstrap.load([r]))));
```
or use built in parallelism
bootstrap.load(resources, onload,onerror, {limit:8});
---

## 3. Caching

Leverage caching at multiple levels:

* **m7Fetch** built-in cache (via net.batch)
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
