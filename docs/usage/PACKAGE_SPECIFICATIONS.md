# 📦 Package & Repo Specifications (Updated)

This section defines the structures used to describe **packages** and **repositories**, including their relationship, valid formats, and resolution rules.

---

## 1. `packageResource`

A `packageResource` is any valid reference to a package that **M7BootStrap** can load.
It can take **three** primary forms:

1. **String** — a direct URL or symbolic resource name
   **Examples:**

   ```js
   "https://example.com/repo/scene/chess.json"
   "scene:chess"
   ```
2. **Object** — a `packageResourceObject`
3. **Inline Package Object** — full package definition included directly in code

---

## 2. `packageResourceObject`

An object form of a package resource.
**Must include:**

* `resource` *(string | object)* — The actual resource to load.
* `repo` *(optional)* — A `repoResource` or array of `repoResource`s.

**Example:**

```json
{
  "resource": "scene:chess",
  "repo": [
    "/repo",
    { "url": "/alt", "method": "POST", "postData": { "foo": "bar" } }
  ]
}
```

---

## 3. `repoResource`

A `repoResource` describes **where and how** to fetch a package.

**Can be:**

1. **String** — base URL for the package

```json
"/repo"
```

2. **Object** — with request metadata:

```json
{
  "url": "/repo",
  "method": "post",
  "postData": { "foo": "bar" },
  "fetchOpts": { "cache": "no-store" }
}
```

---

## 4. `functionResourceObject`

A **functionResourceObject** is the normalized representation of a function handler input, ensuring consistent structure and metadata regardless of how the handler was originally specified.

It may be:

* Direct function reference
* String identifier (`"myFunc"`)
* Symbolic (`"@pkg.fn"`), bootstrapper-local (`"#runner.mount"`), or package-local (`"~logic.init"`) reference
* Configuration object containing a `fn` field

See full details in [Function Resources](FUNCTION_RESOURCES.md).

---

## 5. Inline Package Structure

An inline package definition is a fully self-contained package object.
When `resource` is an object, **no fetching occurs** — it is treated as already resolved.

**Example:**

```json
{
  "resource": {
    "id": "ui:console",
    "title": "Debug Console",
    "assets": [
      { "id": "layout", "type": "html", "url": "layout.html" },
      { "id": "style-console", "type": "css", "url": "style.css" },
      { "id": "style-button", "type": "css", "url": "button-square-dark.css" },
      { "id": "mount", "type": "mount", "url": "mount.json" },
      { "id": "button", "type": "html", "url": "button.html" }
    ],
    "modules": [
      { "id": "logic", "type": "js", "url": "logic.js" }
    ],
    "hooks": {
      "packageLoad":   ["#runners.mountPackage", "~logic.init"],
      "packageError":  ["#runners.packageError"],
      "packageUnload": ["~logic.destroy", "#runners.unmountPackage"],
      "loadPrepend":   null,
      "loadAppend":    null,
      "errorPrepend":  "~logic.teapot",
      "errorAppend":   null
    }
  }
}
```

---

## 6. Hooks

Hooks replace the legacy `run` array. They allow packages to participate in lifecycle events.

**Per-Package Hooks** (triggered for each package individually):

* `packageLoad` — invoked when the package loads successfully.
* `packageError` — invoked if the package fails to load.
* `packageUnload` — invoked when the package is unloaded.

**Append/Prepend Hooks** (merged into the bootstrap-level handler lists):

* `loadPrepend`, `loadAppend` — modify the final load handler list passed to `bootstrap.load(...)`.
* `errorPrepend`, `errorAppend` — modify the final error handler list.

**Notes:**

* Each hook entry accepts any valid `functionResourceObject`.
* Append/prepend hooks are merged at runtime into the top-level load/error lists, allowing package-level customization without overriding global handlers【11†src/BootStrap.js†L71-L101】.
* Handlers may be symbolic (`@`), local (`#`), or package-local (`~`).

---

## 7. Examples of Each Form

**String form**

```js
"scene:chess"
```

**Object + String resource**

```json
{ "resource": "scene:chess", "repo": ["/repo"] }
```

**Object + Inline package (with hooks)**

```json
{ "resource": { "id": "pkg1", "assets": [], "modules": [], "hooks": { "packageLoad": ["init"] } } }
```

---

## 8. Resolution Rules

1. Inline object → loaded immediately; `repo` ignored.
2. String resource + repo → repo base URL combined with resource string.
3. String resource without repo → treated as fully-qualified URL or symbolic name.
4. Duplicate detection — `(type, stem, repos)` normalized to avoid re-fetching.

---

## 9. Validation Notes / Required Fields

* `packageResourceObject.resource` is required.
* Inline package objects must have:

  * `id` *(string)* — unique within runtime
  * Optional: `assets` *(array)*, `modules` *(array)*, `hooks` *(object)*
* `repoResource` objects must have `url` if not a plain string.
* Loader does not validate schema of assets/modules; it trusts definitions.

---

**See Also**

* [Loading Packages](LOADING_PACKAGES.md)
* [Mounting & Unmounting Packages](MOUNTING.md)
* [Hooks & Handlers](HOOKS_AND_HANDLERS.md)
