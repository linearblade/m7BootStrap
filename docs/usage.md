## 📦 Usage

> Requires **m7Fetch** for HTTP/module loading.  
> Repo: https://github.com/linearblade/m7fetch

### 1) Initialize
```js
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

const net = new Net();
const bootstrap = new BootStrap(net);
```

### 2) Load one or more packages
```js
// Options (all optional)
const opts = {
  package: { hooks: true }, // run each package's `run` hooks (default: true)
};

// Handlers can be:
// - a function
// - a global string "myFunc"
// - a symbolic module ref "@pkg.module.fn"
// - a local method "#runner.mount" (bound to `bootstrap`)
const onLoad  = ["#runner.mount", (sys, ctx) => console.log("Loaded:", ctx.results)];
const onError = ["jobFail",       (sys, ctx) => console.warn("Failed:", ctx.failed, ctx.err)];

// Resource list can be:
// - symbolic: "scene:chess"
// - repo-wrapped: { resource: "scene:chess", repo: ["/repo"] }
// - inline package: { resource: { id: "...", assets: [...], modules: [...] } }
const resources = [
  { resource: "scene:chess", repo: ["/repo"] },
  "@resources.allpurposemounter" // resolved by your menu system if you use one
];

// Load all (dependencies are resolved automatically)
const ok = await bootstrap.load(resources, onLoad, onError, opts);
if (!ok) {
  console.error("Boot failed");
}
```

### 3) Unload later (optional)
```js
// Unload by package id (keeps assets/modules if desired)
await bootstrap.unload(
  ["scene:chess"],                 // ids or objects with `.id`
  ["#runner.unmount"],               // onDone handlers
  ["jobFail"],                     // onError handlers
  { ignoreMissing: true }          // options
);
```

### Notes
- Packages can declare assets, modules, dependencies, and run hooks.
- The bootstrapper resolves a dependency graph first, then loads in a safe order.
- Asset/meta registries and module references are tracked for you.
- Mounting is pluggable: ship a mount package or use #runner.mount to apply DOM injections.
