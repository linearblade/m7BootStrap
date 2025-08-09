← Back to [Usage Guide Index](index.md)

# 📖 Glossary

A reference for key terms and concepts used in **M7BootStrap** and related systems.

---

## **Asset**

Any non-code resource (e.g., images, audio, JSON data) that a package declares and can be mounted into the runtime environment.

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

## **Module**

A JavaScript module or script loaded by a package.
Modules may expose functions or classes used by your runtime.

---

## **Mount**

The process of integrating loaded assets/modules into the active runtime environment (e.g., injecting HTML assets into the DOM).

---

## **Package**

A unit of deployable content.
May contain assets, modules, dependencies, and run hooks.

---

## **packageResource**

The normalized form of a package reference (string, object, or inline) used by the loader.
See **Package & Repo Specifications**.

---

## **Repo Resource**

A definition of where and how to fetch a package (URL, HTTP method, optional POST data, etc.).

---

## **Run Hook**

A special hook in a package’s definition that is executed after loading.
Often used for initialization logic.

---

## **Unmount**

The process of removing a package’s assets/modules from the runtime environment.
Can optionally clear related caches and registry entries.

---

## **Visited List**

An internal tracking structure used during dependency resolution to avoid loading the same package multiple times.

---

## **Symbolic Resource Name**

A short identifier (e.g., `"scene:chess"`) that is resolved via repo settings or mapping tables into a full package URL.

---

**See Also:**

* **Loading Packages**
* **Hooks & Handlers**
* **Package & Repo Specifications**
