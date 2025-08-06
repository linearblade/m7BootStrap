# m7Fetch 

**m7Fetch** is a dynamic, modular network toolkit for modern JavaScript environments.  
It provides a clean, extensible interface for loading specs, APIs, and dynamic modules at runtime — all wrapped in a developer-friendly architecture that minimizes boilerplate and promotes flexible usage.

> JavaScript is dynamic — stop trying to collar it like C.  
> If I wanted concrete, I’d use WASM.  
> _(But if you **are** into concrete, check out [Siglatch](https://github.com/linearblade/siglatch) — production-ready, written in C, and extremely useful!)_

---

## 🔧 Purpose

Originally derived from the author's legacy **M7 bootstrapper frameworks** (built over 20 years ago), **m7Fetch** is a modernized, production-ready rework — built to serve dynamic apps, toolchains, and in-browser tasks with minimal setup.

Its design favors:

- Rapid prototyping with structured API access
- Declarative API usage through OpenAPI or custom specs
- Flexible module injection (local or remote)
- Dynamic loading of manifests, assets, and operations
- Headless or console-based automation (yes, even from browser devtools)

---

## ⚡️ Features

- ✅ Unified interface for HTTP, module loading, and spec handling
- 📄 Support for OpenAPI and custom API specs
- 📦 ES module dynamic imports with runtime wiring
- 🧠 AutoLoader intelligently infers spec type and fetches accordingly
- 🕹️ SpecManager handles multiple APIs at once, via operationId-based routing
- 🔁 BatchLoader runs multiple HTTP jobs and emits completion

---

## 📦 Usage

```js
import Net from 'm7Fetch';

const net = new Net();

// Load an OpenAPI spec
await net.specs.load('/specs/dogs.json');

// Call an operation via spec
const dogList = await net.specs.call('dogAPI', 'listDogs');

// Dynamically load a module
const mod = await net.modules.load('mytool', '/tools/helper.js');
mod.doThing();

//load some stuff:
data = await net.http.get('/foo/bar');
more = await net.http.post('/some/post', {a:1,b:2}, {urlencoded: true} )
```

---

## 🚧 Status

This project is **actively maintained**, with its **core modules production-ready**.

Further extensions (like advanced batching, plugin systems, or custom spec types) are in planning or prototype stage.

---


## 📜 License

See [`LICENSE.md`](LICENSE.md) for terms.  
Free for personal, non-commercial use.  
Commercial licensing available under M7 Moderate Team License (MTL-10).

---

## 🤖 AI Usage Disclosure

See [`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md) and [`docs/USE_POLICY.md`](docs/USE_POLICY.md)  
for details on permitted AI usage and operational security boundaries.

---

## 🛠️ Philosophy

> “Fewer assumptions. More control.”  
> m7Fetch prefers _explicit_ behavior and composability over frameworks that abstract away too much.

---

## 💬 Feedback / Security

- General inquiries: [legal@m7.org](mailto:legal@m7.org)  
- Security issues: [security@m7.org](mailto:security@m7.org)
