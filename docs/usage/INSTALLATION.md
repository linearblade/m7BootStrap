← Back to [Usage Guide Index](TOC.md)

# 📦 Installation

## Overview

**M7BootStrap** is distributed as plain JavaScript and can be dropped into any ES module–compatible environment.
There’s no build process required — simply include the files in your project and import them.

---

## 1. Clone or Download

You can include **M7BootStrap** directly in your project by cloning the repository or downloading it as a ZIP.

```bash
# Clone repository
git clone https://github.com/linearblade/m7bootstrap.git

# Or download ZIP from GitHub and extract
```

Recommended project structure:

```
/vendor/
  m7Bootstrap/
    BootStrap.js
  m7Fetch/
    src/
      index.js
```

---

## 2. Install Dependencies

M7BootStrap requires **m7Fetch** for all package and asset fetching.

If using Git:

```bash
git clone https://github.com/linearblade/m7fetch.git vendor/m7Fetch
```

If downloading manually:

* Place **m7Fetch** in your `/vendor/` directory (or anywhere you prefer).
* Ensure the relative import path in your code matches your folder layout.

---

## 3. Import into Your Project

```js
//adjust as necessary if you split the source from your docs.
import Net from "./vendor/m7Fetch/src/index.js";
import BootStrap from "./vendor/m7Bootstrap/BootStrap.js";

const net = new Net();
const bootstrap = new BootStrap(net);
```

---

## 4. Verify Setup

Run a minimal test to confirm installation:

```js
const ok = await bootstrap.load(
  [{ resource: "scene:test", repo: ["/repo"] }],
  {
    load: (sys, ctx) => console.log("Loaded:", ctx),
    error: (sys, ctx) => console.warn("Failed:", ctx)
  }
);

console.log("Boot status:", ok);
```

If you see `Loaded:` \[...] in the console, your installation is working.

---

## Next Steps

Continue to **[Basic Concepts](BASIC_CONCEPTS.md)** to learn the core ideas behind packages, repos, and handlers.
