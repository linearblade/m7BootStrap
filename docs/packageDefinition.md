# 📦 How to Load a Package

Your bootstrap loader supports modular, declarative package loading via standardized JSON definitions.

This guide explains how to structure a package, resolve dependencies, and execute initialization logic.

---

## ✅ Basic Package Structure

Each package defines:

* An **ID** (`scene:`, `engine:`, etc.)
* A list of **assets** to load (HTML, JS, CSS)
* Optional **dependencies** (`requires`)
* Optional **post-load actions** (`run`)

```jsonc
{
  "id": "scene:chess",
  "requires": [
    "engine:square",
    "/shared/utils/colors.js"
  ],
  "assets": [
    { "id": "board-html", "type": "html", "url": "/ui/board.html" },
    { "id": "chess-style", "type": "css", "url": "/ui/chess.css" },
    { "id": "board-script", "type": "js", "module": true, "url": "/logic/board.js" }
  ],
  "run": [
    "initChessScene",
    "@board-script.setup",
    { "call": "@board-script.createPieces", "args": [8, "white"] }
  ]
}
```

---

## 🚀 Loading a Package

To load a package:

```js
await bootstrap.loadPackage("scene:chess");
```

This will:

1. Load any required packages or modules
2. Load all declared assets
3. Register DOM assets (e.g. via `domRegistry`)
4. Execute any `run` logic

---

## 🧐 Supported `run` Entries

| Type                      | Example                                         | Behavior                                         |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Function                  | `() => console.log("hi")`                       | Executes directly                                |
| Global function name      | `"initChessScene"`                              | Calls `window["initChessScene"]()`               |
| Symbolic module reference | `"@board-script.setup"`                         | Calls exported `setup` from asset `board-script` |
| Symbolic w/ arguments     | `{ call: "@board-script.create", args: [...] }` | Calls with args                                  |

---

## 🌐 Remote Packages

You **may load a remote package** via URL:

```js
await bootstrap.loadPackage("/packages/chess.json");
```

**However:**

> ❗ Remote packages must be `.json` files. Do **not** use `.js` remote packages — they are not sandboxed or secured.

This ensures that only structured data is fetched remotely and not evaluated scripts.

---

## ⚠️ Warnings

* Do not use symbolic `@module.fn` references unless the asset is a JavaScript module (`type: "js", module: true`)
* Asset IDs must be unique within a package
* Run entries will fail silently unless you log invalid resolution (recommended)

---

## ✅ Best Practices

* Keep packages focused: 1 engine, 1 scene, 1 UI set, etc.
* Use `group` or `scene:` prefixes for logical unloading
* If loading many at once, prefer batching + `.require()` preloading



{
  id: "scene:chess",                      // ✅ Unique required package ID

  requires: [                             // ⛓ Optional dependencies
    "engine:square",                      // Known internal package
    "/shared/utils/colors.js"             // Direct URL to external asset
  ],

  assets: [                               // 📦 Loadable resources
    { id: "board-html", type: "html", url: "/ui/board.html" },
    { id: "chess-style", type: "css", url: "/ui/chess.css" },
    { id: "board-script", type: "js", module: true, url: "/logic/board.js" }
  ],

  run: [                                  // 🏁 Run after successful load
    "initChessScene",                     // Global function
    () => console.log("✅ Scene booted"),  // Inline callback
    "@board-script.setup",               // Symbolic: module reference
    { call: "@board-script.createPieces", args: [8, "white"] } // With args
  ]
}




