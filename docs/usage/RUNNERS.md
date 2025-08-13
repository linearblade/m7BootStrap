← Back to [Usage Guide Index](TOC.md)

# 🏃 Runners Module

The **Runners** module is a helper for translating `#` symbolic handlers into calls to local system methods, especially when load/unload handlers are invoked with arguments in less‑friendly formats.

It is accessible as `bootstrap.runners`.

---

## Purpose

When you attach a handler like `"#runners.mount"` or `"#runners.unmount"` in your `load`/`error`/`onDone` hooks, the **Runners** module:

1. Parses the `ctx` object provided to the handler.
2. Extracts relevant package IDs from the reports.
3. Forwards each package ID to the appropriate `bootstrap.mount` method.

This allows you to replace direct calls like `"#mount.load"` with `"#runners.mount"`, which automatically handles iteration over multiple packages in the context.

---

## API

### `mount(sys, ctx)`

For each package listed in `ctx.report.packages`, calls:

```js
bootstrap.mount.load(pkgId);
```

Use in `load`-phase handlers to mount packages after they have loaded.

### `unmount(sys, ctx)`

For each package listed in `ctx.report.packages`, calls:

```js
bootstrap.mount.unload(pkgId);
```

Use in `unload`-phase handlers (or top‑level `onDone`) to unmount packages after they have been unloaded.

---

## Example Usage

```js
await bootstrap.load(resources, {
  load: ["#runners.mount"],
  error: ["jobFail"]
});

await bootstrap.unload(["scene:chess"],
  ["#runners.unmount"],
  ["jobFail"]
);
```

In both cases, the runner inspects `ctx.report.packages` and forwards each `pkgId` to the `bootstrap.mount` subsystem.

---

## When to Use Runners

* You want **automatic iteration** over all packages in a load/unload context.
* You want to **simplify handler wiring**, avoiding manual loops over `ctx.report.packages`.
* You prefer symbolic handler references (`"#runners.mount"`) that can be resolved consistently across the system.

---

**Related Topics:**

* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* **[Mounting & Unmounting Packages](MOUNTING.md)**
