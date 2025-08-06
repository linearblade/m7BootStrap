# M7BootStrap

**M7BootStrap** is a modular initialization and mounting toolkit designed for dynamic, simulation-oriented environments.  
It provides a clean and extensible framework for setting up runtime assets, modules, and logic — with an emphasis on composability, clarity, and long-term maintainability.

> Don’t waste cycles building loaders to load loaders.
> Let BootStrap do the groundwork — and get out of the way.
> _(Looking for low-level access control instead? Check out [Siglatch](https://github.com/linearblade/siglatch) — battle-tested and written in C.)_

---

## 🔧 Purpose

Originally derived from the author's 2000s-era **bootloader frameworks**, **M7BootStrap** is a refactored and modernized runtime initializer for simulation engines, editors, and modular applications.

Its primary role is to coordinate:

- Asset and module staging
- Post-load mounting and integration
- Configurable system wiring
- Minimal-assumption boot pipelines

Designed to work in tandem with [m7Fetch](https://github.com/linearblade/m7fetch) or standalone, M7BootStrap provides the glue between loading and logic.

---

## ⚡️ Features

- ✅ Structured boot sequence coordination
- 🧩 Modular mount/unmount lifecycle handlers
- 📁 Runtime asset registration and integration
- 🔄 Customizable stage flow (boot → mount → start → etc.)
- 🔌 Interoperable with dynamic module loaders like `m7Fetch`
- 🧼 Game-agnostic by design — no assumptions about use case or structure

---

## 📦 Usage

```js
import BootStrap from 'M7BootStrap';

// create a new boot coordinator
const boot = new BootStrap();

// register a module to mount after boot
boot.mount('settings', async () => {
  const settings = await fetch('/config/settings.json').then(r => r.json());
  return settings;
});

// run the bootstrapper
await boot.run();

// access mounted module later
console.log(boot.modules.settings);
```

---

## 🚧 Status

This project is **under active development**.  
Core lifecycle phases (`boot`, `mount`, `start`) are implemented and stable, with extended features (mount chaining, diagnostics, plugin hooks) currently being developed.

Public release will follow once internal systems are fully integrated.

---

## 📜 License

See [`LICENSE.md`](LICENSE.md) for terms.  
Free for personal, non-commercial use.  
Commercial licensing available under M7 Moderate Team License (MTL-10).

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
