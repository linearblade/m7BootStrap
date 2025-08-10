← Back to [Usage Guide Index](TOC.md)

# 🧩 Basic Concepts

Before diving into code, it’s important to understand the **core building blocks** of M7BootStrap and how they work together.

---

## 1. Packages

A **package** is the fundamental unit that M7BootStrap loads, mounts, and optionally unmounts.  
A package may contain:

- **Assets** — files, HTML templates, data blobs, images, etc.
- **Modules** — JavaScript modules, scripts, or logic.
- **Metadata** — descriptive info (id, title, etc.).
- **Dependencies** — other packages that must also be loaded.
- **Run hooks** — functions to run immediately after loading.

Packages are defined using the **packageResource** format (see [Package Specifications](PACKAGE_SPECIFICATIONS.md) for details).

---

## 2. packageResource

The **packageResource** describes where and how a package is obtained.  
It can take several forms:

- **String** — a direct URL or symbolic reference (e.g., `"scene:chess"`, or `scene/chess.json`).
- **Object** — includes a `resource` key and optional `repo` key(s).
- **Inline package object** — contains the package’s entire definition in-place (no network fetch required).

---

## 3. Repositories (Repos)

A **repo** tells M7BootStrap *where* to fetch packages from.

- **String repo** — represents a base URL.
- **Object repo** — contains URL plus method, POST data, and fetch options.
- **Array of repos** — multiple sources; tried in order until one succeeds.

---

## 4. The Boot Process

When you call `bootstrap.load(...)`, M7BootStrap:

1. **Builds a dependency graph** from the provided packages.
2. **Fetches all packages in parallel** for speed (dependencies are not loaded in strict order).
3. **Loads assets** into internal registries.
4. **Loads modules** into the bootstrapper’s module store.
5. **Runs hooks** (if enabled).
6. **Invokes your onLoad/onError handlers**.

---

## 5. Mounting and Unmounting

- **Mounting** — Integrating package content (HTML, scripts, styles, etc.) into your application or runtime environment.
- **Unmounting** — Removing package content and clearing modules from M7BootStrap’s registries.
  - If you copied modules elsewhere, you must remove them manually.

---

## 6. Hooks & Handlers

Hooks let packages perform tasks automatically after load/unload.  
Handlers let *you* react to load/unload events with your own code.

- **onLoad** — Runs after a package (or all packages) has loaded.
- **onError** — Runs if a package fails to load.

Handlers can be:
- A direct function.
- A string name (global or symbolic).
- A bound method reference (`"#mount.load"`).

---

## 7. Why Parallel Loading?

Parallel loading maximizes performance, especially when packages include large assets or multiple dependencies.  
Since dependencies are resolved *after* everything loads, you have full control over how and when to integrate them.

---

## Next Steps

Continue to [Quick Start](QUICK_START.md) to see M7BootStrap in action with a minimal example.