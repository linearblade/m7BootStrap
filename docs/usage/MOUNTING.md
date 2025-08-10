← Back to [Usage Guide Index](TOC.md)

# 🧰 Mounting and unmounting assets

Mounting is **not the same** as loading. *Loading/unloading* retrieves packages, resolves dependencies, and manages module/asset registries. *Mounting/unmounting* injects or removes concrete DOM elements described by package **mount assets**.

> The Mount Manager consumes assets of type **`mount`** (JSON configs), injects their DOM nodes, and tracks them so corresponding **unmount** calls can cleanly remove them. It works via the `#mount.load` / `#mount.unload` handlers you attach to `load()` / `unload()`.

---

## When to Use

* **During load:** call `#mount.load` in your `onLoad` handlers to auto‑inject HTML/DOM assets.
* **During unload:** call `#mount.unload` in `onDone` to remove previously injected nodes.
* **Package‑scoped mounting (planned/now supported):** target specific package IDs when mounting/unmounting.

---

## How It Works

1. **Discover mount assets.** The manager queries the bootstrapper for all assets with `type: "mount"`, producing an id→entry map.
2. **Inject DOM nodes.** For each asset’s `items[]`, it calls the DOM injector with selector, method, container, and attributes to create and place nodes.
3. **Track for teardown.** Injected nodes are registered in a DOM registry, grouped by **package ID**, so later unmount can remove them by group.

> Current code path (simplified): `injectAssets()` → `inject()` (resolve per‑package asset + call DOM injector) → `track()` (group by pkgId).

---

## Mount Asset Schema

A **mount asset** is a JSON config with an `items` array. Each item describes how to inject one node.

```ts
// Minimal conceptual schema for a mount item
{
  id: string,          // required: local asset ID (must exist in the package)
  selector?: string,   // CSS selector to target; default: 'body'
  container?: string,  // wrapper tag name: 'div' | 'section' | 'style' | 'template' | ...
  method?: string,     // 'replace' | 'before' | 'after' | 'prepend' | 'append' (default: 'append')
  dissolve?: boolean,  // if true and wrapper has one child, replace wrapper with its child
  attrs?: object       // HTML attributes to apply to the wrapper
}
```

The runtime resolves the package‑local \*\*asset \*\*\`\` and hands its content to the DOM injector with the above placement options.

---

## API: Handlers

### `#mount.load`

Mount all eligible `type:"mount"` assets.

* **Default behavior:** inject all `mount` assets for the relevant packages.
* **Tracking:** nodes are recorded in the DOM registry under their **package group** for later removal.

### `#mount.unload`

Remove previously injected nodes.

* **Default behavior (legacy builds):** clear the DOM registry (global).
* **Planned/updated behavior:** unmount by **package ID** (or set of IDs), leaving other packages’ nodes intact.

---

## Package Targeting

We support (or are introducing) **package‑scoped** mounting/unmounting. Use one of the following patterns:

### 1) Via `options` (works today and future‑proof)

Pass target packages in the `options` object (accessible to handlers via `ctx.options`).

```js
await bootstrap.load(resources,
  [
    { fn: "#mount.load" } // handler sees ctx.options.mount.packages
  ],
  null,
  {
    mount: { packages: ["scene:chess", "allpurposemounter"] }
  }
);

await bootstrap.unload(
  ["scene:chess"],
  [ { fn: "#mount.unload" } ],
  null,
  { mount: { packages: ["scene:chess"] } }
);
```

### 2) Via functionResourceObject args (planned direct args)

If/when `#mount.*` accepts inline args on the handler:

```js
const onLoad = [
  { fn: "#mount.load", args: { packages: ["scene:chess"] } }
];

const onDone = [
  { fn: "#mount.unload", args: { packages: ["scene:chess"] } }
];
```

Both approaches result in **per‑package** injection/teardown rather than global effects.

---

## Usage Examples

### Mount during Load

```js
const onLoad = ["#mount.load"]; // auto‑inject mount assets from loaded packages
await bootstrap.load(resources, onLoad, ["jobFail"], {
  hooks: true,
  mount: { packages: ["scene:chess"] } // optional narrowing
});
```

### Unmount during Unload

```js
await bootstrap.unload(
  ["scene:chess"],
  ["#mount.unload"],    // remove nodes injected for this package
  ["jobFail"],
  { mount: { packages: ["scene:chess"] } }
);
```

---

## Notes & Caveats

* **Selector defaults:** if `selector` is omitted, elements are appended to `document.body`.
* **Per‑package lookups:** injected items resolve using the package‑scoped asset registry; a missing local id logs a warning.
* **Registry semantics:** nodes are tracked with `group = pkgId` so unmount can target a specific package.
* **Legacy behavior:** older builds call `registry.clear(null, true)` on unload (clears broadly); newer behavior targets groups.

---

## Troubleshooting

* **Nothing appears in the DOM**

  * Confirm you shipped an asset of `type: "mount"` and its `content.body.items` array is present.
  * Verify the local `id` matches an asset in the package.
* **Unmount removed too much**

  * Ensure you’re passing `packages: [...]` via `options.mount` (or handler args) so only that package’s nodes are cleared.
* **Selector conflicts**

  * Use a more precise `selector` and `container`, or set `attrs` with unique `id`/`class` values.

---

**Related Topics**

* **[Loading Packages](LOADING_PACKAGES.md)** — attach `#mount.load` in `onLoad`
* **[Mounting & Unmounting Packages](MOUNTING.md)** — attach `#mount.unload` in `onDone`
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)** — handler forms & `functionResourceObject`
* **[Package & Repo Specifications](PACKAGE_SPECIFICATIONS.md)** — asset definitions & function resource objects
