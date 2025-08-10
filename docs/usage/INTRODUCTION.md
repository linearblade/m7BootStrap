← Back to [Usage Guide Index](TOC.md)

# 📘 Introduction & Requirements

## Introduction

**M7BootStrap** is a runtime package management toolkit designed to simplify loading, mounting, and unloading packages in dynamic JavaScript environments.  
It abstracts away the complexity of fetching, integrating, and organizing assets and modules, allowing you to focus on application logic instead of plumbing.

It is backend-agnostic — because it’s written entirely in JavaScript, it can run in browsers, Node.js, Electron, or any JS runtime that supports ES modules.  
No special server setup is required beyond serving your package files.

Typical use cases include:

- Loading modular application components on demand
- Coordinating asset and code package dependencies at runtime
- Building tools, editors, or games that require dynamic resource management
- Providing a consistent package interface in projects without a static build pipeline

---

## Requirements

To use **M7BootStrap**, you’ll need:

1. **JavaScript Runtime**  
   - Modern browser with ES module support, **or**  
   - Node.js ≥ 18.x (earlier versions may work with ES module flags enabled)

2. **[m7Fetch](https://github.com/linearblade/m7fetch)**  
   - Required for HTTP/package fetching.  
   - Handles all network requests, package resolution, and repo interactions.

3. **Package Sources**  
   - Packages must be accessible via URL or inline definition.
   - Supported forms:
     - Direct URL string  
     - `packageResourceObject` with `resource` and optional `repo`  
     - Inline package definition

4. **Basic Knowledge**  
   - Understanding of JavaScript modules (`import`/`export`)  
   - Familiarity with asynchronous code (`async`/`await`)

---

## Next Steps

Once you’ve reviewed the requirements, proceed to [Installation](INSTALLATION.md) for setup instructions.