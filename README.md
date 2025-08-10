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

For detailed instructions and examples, please refer to the usage guide:

* **Installation** → [INSTALLATION.md](docs/usage/INSTALLATION.md)
* **Quick Start** → [QUICKSTART.md](docs/usage/QUICKSTART.md)
* **Example Library** → [EXAMPLES\_LIBRARY.md](docs/usage/EXAMPLES_LIBRARY.md)

---

## 💡 Use Cases

As a runtime package loader, **m7Bootstrap** excels in scenarios where flexibility, speed, and minimal setup are critical:

- **Website injection** —  
  Quickly run scripts or inject assets into someone else’s webpage without touching the server.  
  Great for testing, content experiments, or automating UI tweaks.  
  *(See [Example Library](docs/usage/EXAMPLES_LIBRARY.md) for DOM injection examples)*.

- **Custom browser extensions** —  
  Dynamically load resources or features on demand.  
  Chrome and other browsers may restrict this for app store–listed extensions, but if you’re sideloading or not publishing to a store, you can generally do whatever you want.  
  *(See [Installation](docs/usage/INSTALLATION.md) for setup details)*.

- **Rapid prototyping** —  
  Skip the boilerplate of heavier frameworks and focus on writing feature code.  
  Perfect for hackathons, proof-of-concepts, and small demos where time is critical.  
  *(See [Quick Start](docs/usage/QUICKSTART.md) for the minimal setup)*.

- **Game engines** —  
  Load and unload scenes, UI layers, or even full engine modules on demand.  
  Ideal for DOM-driven game engines or hybrid HTML5/WebGL projects.  
  *(See [Example Library](docs/usage/EXAMPLES_LIBRARY.md) for asset and module loading patterns)*.

- **Single-page applications (SPAs)** —  
  Dynamically load new features, pages, or dependencies without a full page reload.  
  Works well alongside existing frameworks or vanilla JS routing.

- **Internal tools & dashboards** —  
  Load widgets, analytics panels, or feature modules on demand without redeploying the entire dashboard.

- **A/B testing & feature flags** —  
  Swap UI or logic modules dynamically for experiments without full redeploys.

- **Legacy system augmentation** —  
  Add modern JavaScript modules to older, server-rendered apps without touching backend code.

- **Client demo environments** —  
  Pull packages from a staging repo for “live” previews without maintaining a full build.

- **Offline-first scenarios** —  
  Cache packages locally for offline use and update them selectively when online.

- **Resource-restricted environments** —  
  Since **m7Bootstrap** requires no particular backend, it’s extremely easy to set up inside environments that typically demand a dedicated server or heavy backend to serve specialized content.  
  This makes it a good fit for projects built with frameworks that normally require Node, Angular, or similar stacks.

- **Micro-frontend orchestration** —  
  Dynamically load and swap independent frontend modules at runtime, enabling teams to work in isolation and deploy updates independently without rebuilding the entire app.  
  Particularly useful in large-scale applications where different parts of the UI are maintained by separate teams.

- **Live plugin systems** —  
  Enable, disable, or swap plugins while the application is running without a page refresh.  
  Perfect for extensible platforms, CMS-like systems, or apps with user-selectable feature sets.

Once your package stack is complete, you can inline it or bundle it into a single package for faster load times.

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
