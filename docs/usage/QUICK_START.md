← Back to [Usage Guide Index](TOC.md)

# 🚀 Quick Start

This example shows the fastest way to get M7BootStrap running in your project.
We’ll initialize the bootstrapper, load a package, and mount its content.

---

## 1. Requirements

* **m7Fetch** for package and asset fetching.
  Repo: [https://github.com/linearblade/m7fetch](https://github.com/linearblade/m7fetch)
* A JavaScript environment that supports `import`/ES modules (Node 18+, modern browsers).

---

## 2. Project Structure

```plaintext
your-project/
  vendor/
    m7Bootstrap/
      BootStrap.js
    m7Fetch/
      src/
        index.js
  index.js
```

---

## 3. Example Package

For demonstration, we’ll use a symbolic package reference and a repo definition:

```js
const resources = [
  { resource: "scene:chess", repo: ["/repo"] }
];
```

---

## 4. Minimal Code Example

```js
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

// Initialize networking layer and bootstrapper
const net = new Net();
const bootstrap = new BootStrap(net);

// Define package load options
const opts = {
  package: { hooks: true } // run package-defined "run" hooks (default: true)
};

// Handlers
const onLoad = [
  "#mount.load", // symbolic reference to a bootstrapper method
  (sys, ctx) => console.log("Loaded packages:", ctx)
];

const onError = [
  "logFailure",
  (sys, ctx) => console.warn("Failed to load:", ctx)
];

// Load the package(s)
const success = await bootstrap.load(resources, onLoad, onError, opts);

if (!success) {
  console.error("Bootstrap failed");
}
```

---

## 5. What Happens Here

1. **Dependency resolution** — M7BootStrap builds a dependency graph from resources.
2. **Parallel fetch** — Packages, assets, and modules are retrieved as quickly as possible.
3. **Mounting** — HTML assets are mounted automatically; modules are stored in bootstrap’s registry.
4. **Hooks** — If enabled, any run hooks in packages are executed.
5. **Handlers** — onLoad or onError handlers are run with full context.

---

## 6. Unmounting Example

```js
await bootstrap.unload(
  ["scene:chess"],        // package ids
  ["#mount.unload"],      // onDone handlers
  ["logFailure"],         // onError handlers
  { ignoreMissing: true } // options
);
```

This removes the package’s mounted assets and clears modules from the bootstrapper.
If you copied modules elsewhere, you’ll need to remove them manually.

---

## Next Steps

* Learn how to configure resources and repos in detail: **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**
* Explore the full set of lifecycle hooks and event handlers: **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* Continue to **[Core API Overview](CORE_API_OVERVIEW.md)** to learn the primary methods exposed for use