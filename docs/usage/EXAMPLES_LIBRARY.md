← Back to [Usage Guide Index](TOC.md)

# 📚 Examples Library

This section contains ready-to-use examples for common **M7BootStrap** usage patterns.
Each example is self-contained and demonstrates a specific concept or feature.

---

## 1. Basic Package Load

```js
//adjust as necessary if you split the source from your docs.
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";
import defaultLoadOpts   from "./vendor/m7BootStrap/src/defaults/defaultLoadOpts.js";
import defaultUnloadOpts from "./vendor/m7BootStrap/src/defaults/defaultUnloadOpts.js";


const net = new Net();
//no default options
//const bootstrap = new BootStrap(net);
//use the default options to get granular breakdown of whats going on.
const bootstrap = new BootStrap(net, {load: defaultLoadOpts, unload : defaultUnloadOpts} );

const report = await bootstrap.load('/vendor/m7BootStrap/examples/test/validateInstall/package.json',  {
    load: (sys, ctx) => console.log("Loaded:", ctx),
    error: (sys, ctx) => console.warn("Failed:", ctx)
  }
);

if (!report.success) {
  console.warn("One or more packages failed to load.");
}
```

A more advanced setup:

head to [a basic console example](../../examples/console/example.html)
```html
  <script>
    async function teardown(e){
        const unrv = await bootstrap.unload('ui:console');
        console.log(unrv);
        document.querySelector("#load-button").style.display='';
        document.querySelector("#unload-button").style.display='none';

    }
    async function load_console(e){

        // you can override the defaults like so...
        //const report = await bootstrap.load("/vendor/m7Bootstrap/examples/console/package.json",{load:["#runners.mount","stuff"],error: "badstuff",package:{hooks:true} });
        const report = await bootstrap.load("/vendor/m7Bootstrap/examples/console/package.json",{package:{hooks:true} });
        console.log(report);

        document.querySelector("#load-button").style.display='none';
        document.querySelector("#unload-button").style.display='';


    }
  </script>

  <script type="module">
    import Net               from "./vendor/m7Fetch/src/index.js";
    import BootStrap         from "./vendor/m7BootStrap/src/BootStrap.js";
    import defaultLoadOpts   from "./vendor/m7BootStrap/src/defaults/defaultLoadOpts.js";
    import defaultUnloadOpts from "./vendor/m7BootStrap/src/defaults/defaultUnloadOpts.js";


    const net = new Net();
    const bootstrap = new BootStrap(net, {load: defaultLoadOpts, unload : defaultUnloadOpts} );

    window.net = net;
    window.bootstrap = bootstrap;
    //you can change the defaults at any time like this.
    //bootstrap.setDefaultLoadOpts(defaultLoadOpts);
    //merge = true == merge the new opts with current;
    //bootstrap.setDefaultLoadOpts(defaultLoadOpts,true);
    //bootstrap.setDefaultUnloadOpts(defaultUnloadOpts);
    load_console();
  </script>
```

copy the example to your doc root (or whever, but you'll have to adjust your paths). you will find a basic console app which can be installed.


---

## 2. Loading with Inline Package

Packages may be inlined to avoid downloading. After You've built a setup, you may wish to formalize it and skip the downloading step. Extremely enterprising individuals might even write their own bundles and
destructure them on their own.

```js
const inlinePkg = {
  resource: {
    id: "allpurposemounter",
    title: "General Purpose Mounting Tool",
    assets: [
      { id: "mountinstructions", inline: true, content: { a: "b", nums: [1, 2, 3] } }
    ],
    modules: [],
    hooks: {packageLoad: ["mountusMaximus"]}
  }
};

await bootstrap.load([inlinePkg], {load, error});
```

---

## 3. Custom Post-Load Handling

There are built in asset mounting tools for static html assets. However any module assignments or rigging must be handled within the load handlers or outside after the load has completed.
the bootstrap instance may be found within sys.bootstrap as well as any other relevant information related to that load.

```js
const onLoad = [
  "#runner.mount", // built-in DOM/asset mount
  (sys, ctx) => {
    console.log("All packages loaded. Moving modules to final location.");
    moveModules(sys.modules);
  }
];

const onError = [
  (sys, ctx) => console.error(`Failed to load:`  ctx)
];

await bootstrap.load(resources, {load:onLoad, error:onError});
```

---

## 4. Unloading Packages

Packages loaded will inherit the hook status from the inital load. That is, if you looked a package and allowed hooks, you dont have to specify hooks = true
if you set hooks to false, any customized package unmounting functionality will not be run.

```js
await bootstrap.unload(
  ["scene:chess"],
{
   load:  ["#runner.unmount", cleanupModules],
   error: ["jobFail"],
   ignoreMissing: true,
   hooks: undefined //could be true or false as well
}
);
```

---

## 5. Parallel Loading of Multiple Packages

```js
const resources = [
  { resource: "scene:chess", repo: ["/repo"] },
  { resource: "utils:hamsters", repo: ["/repo"] }
];

await bootstrap.load(resources, {load:onLoad, error:onError});
```

---

## 6. Using Symbolic Resource Names

```js
const resources = [
  "@resources.chessScene",
  "@resources.hamsterUtils"
];

await bootstrap.load(resources, {load:"#runner.mount", error:"globally_scoped_function"});
```

---

## 7. Mixed Package Types

```js
const resources = [
  "scene:chess",                               // plain symbolic
  { resource: "utils:hamsters", repo: ["/r"] }, // with repo
  { resource: inlinePkg }                       // inline
];

await bootstrap.load(resources, {load:onLoad, error:onError});
```

---

## 8. Debugging Dependency Graph

```js
const graph = await bootstrap.repo.buildDependencyGraph(resources);
console.log("Dependency Graph:", graph);
```

---

**See Also:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* **[Troubleshooting](TROUBLESHOOTING.md)**
