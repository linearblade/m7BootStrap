← Back to [Usage Guide Index](TOC.md)

# 📖 Glossary

A reference for key terms and concepts used in **M7BootStrap** and related systems.

---

## **Asset**

Any resource declared by a package that can be loaded into the bootstrapper and optionally mounted into the runtime environment.

Assets can be non-code (e.g., images, audio, JSON data, stylesheets) or code-based (e.g., JavaScript files, modules, CSS).
These are generally inline objects or external resources intended to be injected into the DOM tree.

---

## **Bootstrapper**

The central `BootStrap` instance responsible for loading packages, tracking assets/modules, and managing lifecycle events (mount, unmount, etc.).

---

## **Dependency Graph**

A resolved list of packages (and their dependencies) that must be loaded before runtime execution.
Built by `repo.buildDependencyGraph()` before actual loading begins.

---

## **Handler**

A function or reference string that is executed when a specific lifecycle event occurs.
Handlers can be:

* A function reference
* A global function name (`"myFunc"`)
* A symbolic module ref (`"@pkg.module.fn"`)
* A local bootstrapper-bound method (`"#mount.load"`)

---

## **Hooks**

Built-in lifecycle events (`onLoad`, `onError`, etc.) that you can attach handlers to for custom behavior.

---

## **Inline Package**

A package whose definition is included directly in JavaScript as an object (rather than being fetched from a repo).
**Example:**

```js
{ resource: { id: "pkg1", assets: [...], modules: [...] } }
```

---

## **Load**

The process of retrieving a package (and its dependencies) into the bootstrapper’s internal registries.
This may involve downloading assets, loading modules, and storing metadata, but does not automatically integrate them into the runtime environment.

---

## **Module**

A JavaScript module or script loaded by a package.
Modules may expose functions or classes used by your runtime.

---

## **Mount**

The process of integrating previously loaded assets/modules into the active runtime environment — for example, injecting HTML/CSS into the DOM or binding modules to live systems.

---

## **Package**

A unit of deployable content.
May contain assets, modules, dependencies, and run hooks.

---

## **packageResource**

The normalized form of a package reference (string, object, or inline) used by the loader.
See **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**.

---

## **Repo Resource**

A definition of where and how to fetch a package (URL, HTTP method, optional POST data, etc.).
See **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**.

---

## **Run Hook**

A special hook in a package’s definition that is executed after loading.
Often used for initialization logic.

---
## **Unload**

The process of removing a package from the bootstrapper’s internal registries, clearing its modules and asset references from memory.
Does not necessarily remove already-mounted elements from the runtime environment.

---

## **Unmount**

The process of removing a package’s assets/modules from the active runtime environment.
May also trigger cleanup of associated caches, DOM elements, or event bindings.
Does not necessarily unload the package from the bootstrapper.

---

## **Visited List**

An internal tracking structure used during dependency resolution to avoid loading the same package multiple times.

---

## **Symbolic Resource Name**

A short identifier (e.g., `"scene:chess"`) that is resolved via repo settings or mapping tables into a full package URL.

---

**See Also:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)**
