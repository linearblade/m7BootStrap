# M7BootStrap

**M7BootStrap** is a modular runtime package loading and mounting toolkit, designed to work across a wide range of applications.  
It provides a clean, extensible framework for resolving package dependencies, staging runtime assets and modules, and integrating them into a running system — with an emphasis on composability, clarity, and long-term maintainability.

> Don’t waste cycles building loaders to load loaders.  
> Let BootStrap handle dependency resolution, resource loading, and lifecycle wiring — so you can focus on the actual application logic.

⚠️ **Warning: Documentation Incomplete**
> 
> This project is currently under active development, and documentation is still being written.
> Some features may be undocumented or subject to change.  
> Please check back soon as we continue to update this repository.

---

## 🔧 Purpose

**M7BootStrap** is a runtime package management system for loading and unloading packages — including modules, assets, configuration files, and other runtime resources — while abstracting the complexity away from your project.  

It’s designed to support rapid development and deployment in environments where a static framework is impractical or inconvenient.  

Because it’s implemented entirely in JavaScript, it works with any backend and requires no special server-side setup.

---

## ⚡️ Features

- 📦 **Dynamic package loading & unloading** — handle assets, modules, and other resources at runtime.
- 🔗 **Dependency resolution** — automatically trace and load package dependencies in the correct order.
- ⚡ **Parallel fetching** — download packages and assets concurrently to minimize load times.
- 🔄 **Configurable lifecycle stages** — control boot, mount, start, and teardown phases.
- 🧩 **Modular mount/unmount handlers** — easily add or remove runtime components.
- 🗂️ **Runtime asset registry** — track and reference loaded resources without manual bookkeeping.
- 🌐 **Backend-agnostic** — works with any server or CDN; no special backend setup required.

---


## 📦 Usage

Requires **[m7Fetch](https://github.com/linearblade/m7Fetch)** for HTTP/module loading.

---

### 📚 Full Guide
m7Bootstrap is relatively easy to use, however for advanced users there are a lot of options.
For complete usage examples, package schema details, handler resolution rules, and advanced integration patterns, see:

**[Full Usage Guide →](docs/usage/TOC.md)**

---

### 1️⃣ Install & Import

```js
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

const net = new Net();
const bootstrap = new BootStrap(net);
```

---

### 2️⃣ Load Packages

```js
const resources = [
  { resource: "scene:chess", repo: ["/repo"] },
  { resource: { id: "inlinePkg", modules: [], assets: [] } }
];

const onLoad  = ["#mount.load", (sys, ctx) => console.log("Loaded:", ctx.results)];
const onError = [(sys, ctx) => console.warn("Failed:", ctx.failed)];

const success = await bootstrap.load(resources, onLoad, onError, {
  package: { hooks: true }
});

if (!success) console.error("Boot failed");
```

---

### 3️⃣ Unload Packages

```js
await bootstrap.unload(
  ["scene:chess"],     // Package IDs
  ["#mount.unload"],   // onDone handlers
  ["jobFail"],         // onError handlers
  { ignoreMissing: true }
);
```


---

## 🚧 Status

This project is **under active development** but is production ready, with a few caveats:

* **Parallel loading** means dependencies are not installed in dependency-order.

  This is done for performance reasons; as a runtime loader, prioritizing fast retrieval of assets — including both modules and other resources — takes precedence over loading them in strict dependency order.

  You should wait until *all* packages finish loading, then integrate them into your application as needed.
  For example:

  ```js
  const success = await scenes.bootstrap.load(resourceList, onLoad, onError, {
    package: { hooks: true }
  });

  // onLoad handler
  ["#mount.load", "copy_modules_from_bootstrap_to_final_location"]
  ```

  HTML assets will mount automatically, but if you want to move modules or assets to custom locations, handle that in your post-load hook.

* **Unmounting works correctly** — packages will be unmounted and modules cleared from the bootstrapper — but if you copied those modules elsewhere, you are responsible for removing them from that location.

* **Modules can run in place** — there’s no technical reason they must be relocated. Moving them is purely for organizational or “clean workspace” reasons.

* **Run/error hooks are currently broad** — you’ll know if something failed, but fine-grained context may require checking the console logs.

Core lifecycle phases — package schema loading, asset loading, module loading, and mounting — are stable.
Future updates will improve dependency-aware loading, hook granularity, and diagnostics.

---

## 📜 License

See [`LICENSE.md`](LICENSE.md) for full terms.  
Free for personal, non-commercial use.  
Commercial licensing available under the M7 Moderate Team License (MTL-10).

## 💼 **Integration & Support**

If you’re interested in using M7BootStrap in a commercial project or need assistance with integration,  
support contracts and consulting are available. Contact [legal@m7.org](mailto:legal@m7.org) for details.

---

## 🤖 AI Usage Disclosure

See [`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md) and [`docs/USE_POLICY.md`](docs/USE_POLICY.md)  
for permitted use of AI in derivative tools or automation layers.

---

## 🛠️ Philosophy

> “Initialize only what you mean to use.”  
> BootStrap avoids premature assumptions and allows precise control over app lifecycle stages.

---

## 💬 Feedback / Security

- General inquiries: [legal@m7.org](mailto:legal@m7.org)  
- Security issues: [security@m7.org](mailto:security@m7.org)
