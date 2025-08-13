# 📂 Accessing Data

All retrieved data in **m7BootStrap** can be accessed via:

```js
bootstrap.data
// or
bootstrap.packages.data
```

Both properties are **aliases** that point to the same `PackageData` instance — the central in-memory registry for all loaded packages, assets, and modules.

You can either:

* Access the underlying `Map` objects directly via class properties
* Or use the convenience methods documented below for filtered and structured lookups

---

## Direct Properties

The following `Map` registries are available on `bootstrap.data`:

| Property      | Key Type | Value Type  | Description                            |
| ------------- | -------- | ----------- | -------------------------------------- |
| `packages`    | `string` | `object`    | Loaded package metadata by internal ID |
| `assets`      | `string` | `any`       | Loaded asset content by internal ID    |
| `assetsMeta`  | `string` | `EntryMeta` | Asset metadata records                 |
| `modules`     | `string` | `any`       | Loaded JS module references            |
| `modulesMeta` | `string` | `EntryMeta` | Module metadata records                |

---

## Convenience Methods

### 📦 Package-Level

```js
data.listPackages(filter?)
```

Returns an array of package IDs, optionally filtered.

**Example:**

```js
data.listPackages(meta => meta.loaded);
```

```js
data.getPackages(filter?)
```

Returns all packages as `{ id: PackageEntry }` objects, with assets and modules included.

**Example:**

```js
const pkgs = data.getPackages({ type: "scene" });
```

```js
data.getPackage(id)
```

Returns a single `PackageEntry` by package ID.

**Example:**

```js
const uiPkg = data.getPackage("ui-kit");
```

```js
data.package_isLoaded(id)
```

Boolean: checks if a package is loaded.

**Example:**

```js
if (!data.package_isLoaded("ui-kit")) {
  console.log("Package not yet loaded");
}
```

```js
data.package_setLoaded(id)
```

Marks a package's `meta.loaded = true`.

**Example:**

```js
data.package_setLoaded("ui-kit");
```

---

### 🖼 Assets

```js
data.getAssets(filter?)
```

Returns all assets, optionally filtered by predicate or partial object.

**Example:**

```js
const textures = data.getAssets(meta => meta.type === "texture");
```

```js
data.getAsset(id)
```

Returns a single `AssetEntry` by internal asset ID.

**Example:**

```js
const logo = data.getAsset("pkg1:logo.png");
```

```js
data.getPackageAssets(pkgId, filter?)
```

Returns all assets loaded by a specific package, optionally filtered.

**Example:**

```js
const pkgTextures = data.getPackageAssets("pkg1", { type: "texture" });
```

```js
data.getPackageAsset(pkgId, originalId)
```

Looks up an asset by its **original (un-prefixed)** ID within a package.

**Example:**

```js
const logo = data.getPackageAsset("pkg1", "logo.png");
```

---

### 📜 Modules

```js
data.getModules(filter?)
```

Returns all modules, optionally filtered.

**Example:**

```js
const uiModules = data.getModules(meta => meta.category === "ui");
```

```js
data.getModule(id)
```

Returns a single `ModuleEntry` by internal module ID.

**Example:**

```js
const renderer = data.getModule("pkg1:renderer");
```

```js
data.getPackageModules(pkgId, filter?)
```

Returns all modules loaded by a specific package, optionally filtered.

**Example:**

```js
const mathModules = data.getPackageModules("pkg1", { category: "math" });
```

```js
data.getPackageModule(pkgId, originalId)
```

Looks up a module by its **original (un-prefixed)** ID within a package.

**Example:**

```js
const initFn = data.getPackageModule("pkg1", "init");
```

---

## Filtering

Any method with a `filter` parameter accepts:

* A predicate function `(meta, id) => boolean`
* A shallow partial object `{ key: value, ... }`
* `null` / `undefined` to match all entries

Filtering always matches against the `meta` object.
