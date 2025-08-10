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

**Solutions:**

* Verify the `resource` field is correct:

  ```js
  { resource: "scene:chess", repo: ["/repo"] }
  ```
* Check that your repo server is online and accessible.
* If symbolic names are used (e.g., `@resources.pkgname`), confirm your resolver is set up.

---

## 2. Dependencies Not Loaded in Order

**Symptoms:**

* A package’s code references another package’s module before it’s available.

**Cause:**

* **M7BootStrap** loads packages in parallel for speed.

**Solutions:**

* Wait until all packages finish loading before integration:

  ```js
  const success = await bootstrap.load(resources, onLoad, onError);
  if (success) {
    integrateAllPackages();
  }
  ```
* Or handle order manually in `onLoad`.

---

## 3. Hooks Not Triggering

**Symptoms:**

* `onLoad` or `onError` handlers do not run.

**Causes:**

* Hook references are incorrect.
* Using a string reference that doesn’t match a registered handler.

**Solutions:**

* Use explicit functions for testing:

  ```js
  const onLoad = (sys, ctx) => console.log("Loaded:", ctx.results);
  ```
* Verify symbolic/local handler references exist in the expected scope.

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
    ["#mount.unload", cleanupCustomModules]
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

---

## 7. Debugging Tips

* Enable verbose logging in your environment.
* Inspect the console output for failed resource URLs.
* Log the results of `bootstrap.packages` to see loaded packages.
* For complex dependency chains, manually inspect your `packageResource` objects before loading.

---

**Related Topics:**

* **Loading Packages**
* **Hooks & Handlers**
* **Performance Considerations**
