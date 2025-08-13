← Back to [Usage Guide Index](TOC.md)

# 🛠 Troubleshooting

This section covers common issues you may encounter when using **M7BootStrap** and how to resolve them.

---

## 1. Package Not Found

**Symptoms:**

* Error in console: `Package not found` or `404`
* `onError` handler triggered with `ctx.failed` pointing to the missing package

**Causes:**

* Incorrect package ID or symbolic name
* Missing or misconfigured `repo` field
* Repo server not reachable
* Repo hosted on a different domain without proper credentials configuration
* Package retrieved is invalid or incorrectly formatted JSON
* Repo requires special configuration (e.g., credentials, HTTP method, or POST data for keys)
* Multiple repos configured but not all properly set up

**Solutions:**

* Verify the `resource` field is correct:

  ```js
  { resource: "scene:chess", repo: ["/repo"] }
  ```
* Check that your repo server is online and accessible.
* If symbolic names are used (e.g., `@resources.pkgname`), confirm your resolver is set up.
* If your repo is not hosted on the same domain as the page loading it, configure the `net` instance to send appropriate credentials. See **m7Fetch** documentation for configuration.
* If the retrieved package is incorrectly formatted JSON, check the console for parsing errors and fix the source package.
* If your repo requires special considerations (e.g., credentials, HTTP method, POST data for API keys), configure the repo accordingly. See **Package & Repo Specifications**.
* If you have multiple repos, they will be tried in order. Ensure all repos are properly configured and reachable.

---

## 2. Dependencies Not Loaded in Order

**Symptoms:**

* A package’s code references another package’s module before it’s available.

**Cause:**

* **M7BootStrap** loads packages in parallel for speed.

**Solutions:**

* Wait until all packages finish loading before integration:

  ```js
  const report = await bootstrap.load(resources, {load,error});
  if (report.success) {
    integrateAllPackages();
  }
  ```
* Or handle order manually in `onLoad`.

---

## 3. Hooks Not Triggering

*Symptoms:**

* `onLoad` or `onError` handlers do not run.

**Causes:**
* handlers are specified in the options object. See **[Loading Packages](LOADING_PACKAGES.md)** for information on loading packages.
* packages hooks must be set to true in options {package:{hooks:true}}
* Hook references are incorrect.
* Using a string reference that doesn’t match a registered handler.
* Using symbolic reference types incorrectly (see **Hooks & Handlers** for details).

**Solutions:**

* Use explicit functions for testing:

  ```js
  const onLoad = (sys, ctx) => console.log("Loaded:", ctx.results);
  ```
* Verify symbolic/local handler references exist in the expected scope.
* For symbolic reference types:

  * `~module.function` or `~function` — Used specifically during the **load phase for that package**, references `thisPackage.module.function`. Not valid for general `onLoad` or error handlers.
  * `@somePackage:module.function` — References a module function in a package loaded into the bootstrapper.
  * `#runner.mount` or `#runner.unmount` — Calls bootstrapper methods, primarily for mounting/unmounting operations (no argument support currently).
  * Invalid function resources — Functions must be direct, symbolic, or a resource object (see **Package & Repo Specifications**).

---

## 4. Inline Packages Not Loading Assets

**Symptoms:**

* Inline-defined packages load, but assets don’t appear.

**Causes:**

* Missing `inline: true` flag on asset entries.
* Asset processing logic may not handle the format used.

**Solutions:**

* Ensure each inline asset includes:

  ```js
  { id: "assetId", inline: true, content: {...} }
  ```
* Confirm your asset mounting logic supports inline assets.

---

## 5. Unmount Leaves Copied Modules

**Symptoms:**

* After `unload()`, modules remain in your custom location.

**Cause:**

* **M7BootStrap** clears its own registries but cannot remove modules you copied elsewhere.

**Solutions:**

* Add a cleanup step in your unload handler:

  ```js
  await bootstrap.unload(
    ["scene:chess"],
    ["#runner.unmount", cleanupCustomModules]
  );
  ```

---

## 6. Repo Request Errors

**Symptoms:**

* Network errors, timeouts, or fetch failed.

**Causes:**

* Wrong repo URL or method.
* Cross-origin restrictions.

**Solutions:**

* Double-check the repo config:

  ```js
  { url: "/repo", method: "post", postData: {...} }
  ```
* Use absolute URLs for remote repos.
* Configure CORS on the repo server if needed.
* See **m7Fetch** for client-side configuration, and ensure no base directory is set for it — or set `fetchOpts: { absolute: true }` in the repo config if needed.
---

## 7. Debugging Tips

* Enable verbose logging in your environment.
* Inspect the console output for failed resource URLs.
* Log the results of `bootstrap.packages` to see loaded packages.
* For complex dependency chains, manually inspect your `packageResource` objects before loading.

---

**Related Topics:**

* **[Loading Packages](LOADING_PACKAGES.md)**
* **[Hooks & Handlers](HOOKS_AND_HANDLERS.md)**
* **[Performance Considerations](PERFORMANCE.md)**
